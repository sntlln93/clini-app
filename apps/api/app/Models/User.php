<?php

declare(strict_types=1);

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\MembershipStatus;
use App\Support\CurrentOrganization;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * `blocked_at`/`block_reason` are written only by the platform-operator
 * Actions (forceFill), never mass-assigned, and hidden to keep the clinic
 * `/me` payload unchanged.
 */
#[Fillable(['name', 'email', 'password', 'email_verification_token', 'email_verification_token_expires_at'])]
#[Hidden(['password', 'remember_token', 'email_verification_token', 'email_verification_token_expires_at', 'blocked_at', 'block_reason'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    private ?Membership $currentMembership = null;

    private bool $currentMembershipResolved = false;

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
        ];
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
     * The user's global credential: specialties they are qualified to practise, independent of any organization.
     *
     * @return BelongsToMany<Specialty, $this>
     */
    public function specialties(): BelongsToMany
    {
        return $this->belongsToMany(Specialty::class, 'user_specialties');
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
