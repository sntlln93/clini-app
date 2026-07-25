<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Authorization primitive. A role (MembershipRole) is only a preset of
 * these, defined in code — permissions themselves are what policies check.
 *
 * The `.own` suffix is encoded in the case's value: it scopes the
 * permission to resources owned by the acting membership. The org-wide
 * variant (no suffix) always implies its `.own` counterpart.
 */
enum Permission: string
{
    case PatientsView = 'patients.view';
    case PatientsCreate = 'patients.create';
    case PatientsUpdate = 'patients.update';
    case PatientsDelete = 'patients.delete';

    case AppointmentsView = 'appointments.view';
    case AppointmentsViewOwn = 'appointments.view.own';
    case AppointmentsCreate = 'appointments.create';
    case AppointmentsCreateOwn = 'appointments.create.own';
    case AppointmentsUpdate = 'appointments.update';
    case AppointmentsUpdateOwn = 'appointments.update.own';
    case AppointmentsCancel = 'appointments.cancel';
    case AppointmentsCancelOwn = 'appointments.cancel.own';

    case AvailabilityView = 'availability.view';
    case AvailabilityManage = 'availability.manage';
    case AvailabilityManageOwn = 'availability.manage.own';

    case CatalogView = 'catalog.view';
    case CatalogManage = 'catalog.manage';

    case MembershipsView = 'memberships.view';
    case MembershipsManage = 'memberships.manage';

    case OrganizationView = 'organization.view';
    case OrganizationManage = 'organization.manage';

    /**
     * Whether this permission is scoped to resources owned by the acting
     * membership (its value ends in `.own`).
     */
    public function isOwnScoped(): bool
    {
        return str_ends_with($this->value, '.own');
    }

    /**
     * The org-wide permission this `.own` variant is scoped from, or null
     * when this permission is already org-wide.
     */
    public function orgWide(): ?self
    {
        if (! $this->isOwnScoped()) {
            return null;
        }

        return self::from(substr($this->value, 0, -strlen('.own')));
    }
}
