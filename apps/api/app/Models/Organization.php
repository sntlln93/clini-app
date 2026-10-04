<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\Province;
use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'slug', 'timezone'])]
class Organization extends Model
{
    /** @use HasFactory<OrganizationFactory> */
    use HasFactory, SoftDeletes;

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
}
