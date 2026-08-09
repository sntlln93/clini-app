<?php

declare(strict_types=1);

namespace App\Enums;

enum MembershipRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Professional = 'professional';
    case Staff = 'staff';

    /**
     * Effective permissions are the runtime union of role presets plus extra_permissions — never persisted.
     *
     * @return array<int, Permission>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Owner, self::Admin => array_values(array_filter(
                Permission::cases(),
                fn (Permission $permission): bool => ! $permission->isOwnScoped(),
            )),
            self::Staff => [
                Permission::PatientsView,
                Permission::PatientsCreate,
                Permission::PatientsUpdate,
                Permission::AppointmentsView,
                Permission::AppointmentsCreate,
                Permission::AppointmentsUpdate,
                Permission::AppointmentsCancel,
                Permission::AvailabilityView,
                Permission::AvailabilityManage,
                Permission::CatalogView,
            ],
            self::Professional => [
                Permission::PatientsView,
                Permission::PatientsCreate,
                Permission::PatientsUpdate,
                Permission::AppointmentsViewOwn,
                Permission::AppointmentsCreateOwn,
                Permission::AppointmentsUpdateOwn,
                Permission::AppointmentsCancelOwn,
                Permission::AvailabilityView,
                Permission::AvailabilityManageOwn,
                Permission::CatalogView,
                Permission::CatalogManageOwn,
            ],
        };
    }
}
