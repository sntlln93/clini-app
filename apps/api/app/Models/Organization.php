<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Province;
use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
}
