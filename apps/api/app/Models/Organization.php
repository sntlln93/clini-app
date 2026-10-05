<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AppointmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\Province;
use App\Enums\SubscriptionStatus;
use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * `suspended_at`/`suspension_reason` are written only by the operator
 * Actions (forceFill), never mass-assigned; the reason stays hidden so the
 * clinic `/me` payload — which serializes this model — never exposes it.
 */
#[Fillable(['name', 'slug', 'timezone'])]
#[Hidden(['suspension_reason'])]
class Organization extends Model
{
    /** @use HasFactory<OrganizationFactory> */
    use HasFactory, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'suspended_at' => 'immutable_datetime',
        ];
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    /**
     * @return HasMany<Membership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /**
     * The organization's own closure days — not the shared national or
     * provincial Holiday catalog.
     *
     * @return HasMany<OrganizationHoliday, $this>
     */
    public function organizationHolidays(): HasMany
    {
        return $this->hasMany(OrganizationHoliday::class);
    }

    /**
     * @return HasMany<Specialty, $this>
     */
    public function specialties(): HasMany
    {
        return $this->hasMany(Specialty::class);
    }

    /**
     * @return HasMany<Service, $this>
     */
    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    /**
     * @return HasMany<Appointment, $this>
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * @return MorphMany<Address, $this>
     */
    public function addresses(): MorphMany
    {
        return $this->morphMany(Address::class, 'addressable');
    }

    /**
     * The organization's primary address: its oldest one.
     *
     * @return MorphOne<Address, $this>
     */
    public function address(): MorphOne
    {
        return $this->morphOne(Address::class, 'addressable')->oldestOfMany();
    }

    /**
     * Resolved through address → city → province; null when the
     * organization has no address or its address has no city, in which
     * case only national holidays apply to it.
     */
    public function resolveProvince(): ?Province
    {
        return $this->address?->city?->province?->slug;
    }

    /**
     * @return BelongsToMany<Patient, $this>
     */
    public function patients(): BelongsToMany
    {
        return $this->belongsToMany(Patient::class, 'organization_patient')->withTimestamps();
    }

    /**
     * @return HasOne<Subscription, $this>
     */
    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class);
    }

    /**
     * Users holding an active owner membership — the recipients of
     * subscription notices. `roles` is an EnumArrayCast column, so the
     * role is filtered in PHP rather than SQL.
     *
     * @return Collection<int, User>
     */
    public function ownerUsers(): Collection
    {
        $userIds = Membership::withoutGlobalScope('organization')
            ->where('organization_id', $this->id)
            ->where('status', MembershipStatus::Active)
            ->get()
            ->filter(function (Membership $membership): bool {
                /** @var array<int, MembershipRole> $roles */
                $roles = $membership->roles;

                return in_array(MembershipRole::Owner, $roles, true);
            })
            ->pluck('user_id')
            ->all();

        return User::query()->whereIn('id', $userIds)->get();
    }

    /**
     * Case-insensitive contains match on name or slug.
     *
     * @param  Builder<Organization>  $query
     * @return Builder<Organization>
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if ($term === null || $term === '') {
            return $query;
        }

        return $query->where(function (Builder $query) use ($term) {
            $query->where('name', 'ilike', "%{$term}%")
                ->orWhere('slug', 'ilike', "%{$term}%");
        });
    }

    /**
     * `active` or `suspended`; anything else is no filter.
     *
     * @param  Builder<Organization>  $query
     * @return Builder<Organization>
     */
    public function scopeSuspensionState(Builder $query, ?string $state): Builder
    {
        return match ($state) {
            'active' => $query->whereNull('suspended_at'),
            'suspended' => $query->whereNotNull('suspended_at'),
            default => $query,
        };
    }

    /**
     * `none` matches organizations with no subscription row; any
     * SubscriptionStatus value matches that status.
     *
     * @param  Builder<Organization>  $query
     * @return Builder<Organization>
     */
    public function scopeSubscriptionState(Builder $query, ?string $state): Builder
    {
        if ($state === null || $state === '') {
            return $query;
        }

        if ($state === 'none') {
            return $query->whereDoesntHave('subscription', fn (Builder $query) => $query->withoutGlobalScope('organization'));
        }

        $status = SubscriptionStatus::from($state);

        return $query->whereHas('subscription', fn (Builder $query) => $query->withoutGlobalScope('organization')->where('status', $status));
    }

    /**
     * Platform-operator list shape: active (non-deleted) member count and
     * the subscription, both read without the tenant scope.
     *
     * @param  Builder<Organization>  $query
     * @return Builder<Organization>
     */
    public function scopeWithAdminListing(Builder $query): Builder
    {
        return $query
            ->withCount(['memberships as active_members_count' => fn (Builder $query) => $query
                ->withoutGlobalScope('organization')
                ->where('status', MembershipStatus::Active)])
            ->with(['subscription' => fn ($query) => $query->withoutGlobalScope('organization')]);
    }

    /**
     * Platform-operator detail shape: the listing plus members (oldest
     * first, with their user) and the `usage_*` aggregates.
     *
     * @param  Builder<Organization>  $query
     * @return Builder<Organization>
     */
    public function scopeWithAdminDetail(Builder $query): Builder
    {
        $unscoped = fn (Builder $query) => $query->withoutGlobalScope('organization');
        $since = now()->subDays(30);

        return $query
            ->withAdminListing()
            ->withCount([
                'patients as usage_patients',
                'memberships as usage_professionals' => fn (Builder $query) => $unscoped($query)
                    ->where('status', MembershipStatus::Active)
                    ->whereJsonContains('roles', MembershipRole::Professional->value),
                'appointments as usage_appointments_total' => $unscoped,
                'appointments as usage_appointments_last_30_days' => fn (Builder $query) => $unscoped($query)
                    ->where('created_at', '>=', $since),
                'appointments as usage_appointments_upcoming' => fn (Builder $query) => $unscoped($query)
                    ->where('start_at', '>=', now())
                    ->whereIn('status', [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed]),
            ])
            ->withMax(['appointments as usage_last_appointment_created_at' => $unscoped], 'created_at')
            ->with(['memberships' => fn ($query) => $query
                ->withoutGlobalScope('organization')
                ->with('user')
                ->orderBy('created_at')
                ->orderBy('id')]);
    }
}
