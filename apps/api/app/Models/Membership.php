<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\EnumArrayCast;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\Permission;
use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\MembershipFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['organization_id', 'user_id', 'roles', 'extra_permissions', 'status'])]
class Membership extends Model
{
    /** @use HasFactory<MembershipFactory> */
    use BelongsToOrganization, HasFactory, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'roles' => EnumArrayCast::class.':'.MembershipRole::class,
            'extra_permissions' => EnumArrayCast::class.':'.Permission::class,
            'status' => MembershipStatus::class,
        ];
    }

    /**
     * Effective permissions: the union of every role's preset plus
     * extra_permissions, without duplicates. Computed at runtime, never
     * persisted.
     *
     * @return array<int, Permission>
     */
    public function permissions(): array
    {
        /** @var array<int, MembershipRole> $roles */
        $roles = $this->roles;

        /** @var array<int, Permission> $extra */
        $extra = $this->extra_permissions;

        $rolePermissions = collect($roles)
            ->flatMap(fn (MembershipRole $role): array => $role->permissions());

        return $rolePermissions->merge($extra)
            ->unique(fn (Permission $permission): string => $permission->value)
            ->values()
            ->all();
    }

    /**
     * Whether the membership has $permission, either directly or — for a
     * `.own` permission — through its org-wide counterpart.
     */
    public function hasPermission(Permission $permission): bool
    {
        $effective = $this->permissions();

        if (in_array($permission, $effective, true)) {
            return true;
        }

        if (! $permission->isOwnScoped()) {
            return false;
        }

        $orgWide = $permission->orgWide();

        return $orgWide !== null && in_array($orgWide, $effective, true);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsToMany<Specialty, $this>
     */
    public function specialties(): BelongsToMany
    {
        return $this->belongsToMany(Specialty::class, 'professional_specialties');
    }

    /**
     * @return BelongsToMany<Service, $this>
     */
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'professional_services');
    }

    /**
     * @return HasMany<Availability, $this>
     */
    public function availabilities(): HasMany
    {
        return $this->hasMany(Availability::class);
    }

    /**
     * @return HasMany<Appointment, $this>
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
