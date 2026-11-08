<?php

declare(strict_types=1);

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\MembershipStatus;
use App\Support\CurrentOrganization;
use App\Support\DocumentIndex;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * `blocked_at`/`block_reason` are written only by the platform-operator
 * Actions (forceFill), never mass-assigned, and hidden to keep the clinic
 * `/me` payload unchanged. The `two_factor_*` columns (#357) are written
 * only by the two-factor Actions, the same way, and never leave the API.
 * `document_number` (#380), the professional's DNI, is written only by its
 * Actions, encrypted, and read only through its own endpoint; once loaded,
 * only support changes it (#417). It is searched only by its blind index,
 * `document_number_index` (`DocumentIndex`), which every write of the DNI
 * writes with it (`documentNumber()`), so the two never disagree.
 */
#[Fillable(['name', 'email', 'password', 'email_verification_token', 'email_verification_token_expires_at'])]
#[Hidden(['password', 'remember_token', 'email_verification_token', 'email_verification_token_expires_at', 'blocked_at', 'block_reason', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'two_factor_last_used_step', 'document_number', 'document_number_index', 'document_checked_at'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    private ?Membership $currentMembership = null;

    private bool $currentMembershipResolved = false;

    /**
     * Writing the DNI writes its blind index with it (#417), whatever path writes it: a mutator, not a model event,
     * since the seeder runs without events.
     *
     * @return Attribute<string|null, string|null>
     */
    protected function documentNumber(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value): array => [
                'document_number' => $value === null ? null : $this->castAttributeAsEncryptedString('document_number', $value),
                'document_number_index' => $value === null ? null : DocumentIndex::of($value),
            ],
        );
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'email_verification_token_expires_at' => 'datetime',
            'blocked_at' => 'immutable_datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'immutable_datetime',
            'two_factor_last_used_step' => 'integer',
            'document_number' => 'encrypted',
            'document_checked_at' => 'immutable_datetime',
        ];
    }

    /**
     * A secret alone is a setup still waiting for its first code; the
     * factor only guards the login once that code confirmed it.
     */
    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_secret !== null && $this->two_factor_confirmed_at !== null;
    }

    public function isBlocked(): bool
    {
        return $this->blocked_at !== null;
    }

    /**
     * @return HasMany<Membership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /**
     * The user's licenses (#380): they travel with the person, not with an organization, and the verified ones back the
     * specialties a practice may offer them with (#387, `Specialty::backedFor()`).
     *
     * @return HasMany<ProfessionalLicense, $this>
     */
    public function professionalLicenses(): HasMany
    {
        return $this->hasMany(ProfessionalLicense::class);
    }

    /**
     * The account a DNI belongs to (#417): searched by its blind index alone, under every key in use.
     *
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    public function scopeWithDocument(Builder $query, string $documentNumber): Builder
    {
        return $query->whereIn('document_number_index', DocumentIndex::candidates($documentNumber));
    }

    /** The user's active membership in the currently active organization (App\Support\CurrentOrganization), memoized per request. */
    public function currentMembership(): ?Membership
    {
        if ($this->currentMembershipResolved) {
            return $this->currentMembership;
        }

        $this->currentMembershipResolved = true;

        $organizationId = app(CurrentOrganization::class)->get();

        if ($organizationId === null) {
            return $this->currentMembership = null;
        }

        return $this->currentMembership = $this->memberships()
            ->where('organization_id', $organizationId)
            ->where('status', MembershipStatus::Active)
            ->first();
    }

    /**
     * Case-insensitive contains match on name or email.
     *
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if ($term === null || $term === '') {
            return $query;
        }

        return $query->where(function (Builder $query) use ($term) {
            $query->where('name', 'ilike', "%{$term}%")
                ->orWhere('email', 'ilike', "%{$term}%");
        });
    }

    /**
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    public function scopeVerified(Builder $query, ?bool $verified): Builder
    {
        return match ($verified) {
            true => $query->whereNotNull('email_verified_at'),
            false => $query->whereNull('email_verified_at'),
            null => $query,
        };
    }

    /**
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    public function scopeBlocked(Builder $query, ?bool $blocked): Builder
    {
        return match ($blocked) {
            true => $query->whereNotNull('blocked_at'),
            false => $query->whereNull('blocked_at'),
            null => $query,
        };
    }

    /**
     * Platform-operator list shape: count of non-deleted memberships of
     * non-deleted organizations, any status, read without the tenant scope.
     *
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    public function scopeWithAdminListing(Builder $query): Builder
    {
        return $query->withCount(['memberships' => fn (Builder $query) => $query
            ->withoutGlobalScope('organization')
            ->whereHas('organization')]);
    }

    /**
     * Platform-operator detail shape: the listing plus those memberships
     * (newest first) with their organization.
     *
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    public function scopeWithAdminDetail(Builder $query): Builder
    {
        return $query
            ->withAdminListing()
            ->with(['memberships' => fn ($query) => $query
                ->withoutGlobalScope('organization')
                ->whereHas('organization')
                ->with('organization')
                ->orderByDesc('created_at')
                ->orderByDesc('id')]);
    }
}
