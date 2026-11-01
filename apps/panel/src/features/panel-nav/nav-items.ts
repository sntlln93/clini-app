import type { MembershipRole } from '@/types/membership';
import type { PlanFeature } from '@/types/plan';
import {
    Armchair,
    Calendar,
    ChartColumn,
    Clock,
    Stethoscope,
    Users,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type NavItem = {
    label: string;
    to: string;
    /** Shown next to the label in the main navigation; a secondary bar is text only. */
    icon?: ComponentType<{ className?: string }>;
    /** Absent = always visible; when set, the item renders only if the session holds any of these permissions (or any of `roles`). */
    permissions?: string[];
    /** Like `permissions`, for the roles of the active membership; with both, either one is enough. */
    roles?: MembershipRole[];
    /** When set, the item renders only if the organization's plan includes it (#237). */
    feature?: PlanFeature;
    /** When true, the item renders only with an active membership (an organization to act on). */
    requiresMembership?: boolean;
    /** When true, the item is active only on `to` itself, not on the routes below it (a section's index sub-page). */
    exact?: boolean;
};

export const navItems: NavItem[] = [
    { label: 'Agenda', to: '/agenda', icon: Calendar },
    {
        label: 'Sala de espera',
        to: '/sala-de-espera',
        icon: Armchair,
        feature: 'waiting_room',
    },
    { label: 'Pacientes', to: '/pacientes', icon: Users },
    {
        label: 'Profesionales',
        to: '/profesionales',
        icon: Stethoscope,
        permissions: ['memberships.view'],
    },
    { label: 'Disponibilidad', to: '/disponibilidad', icon: Clock },
    {
        label: 'Reportes',
        to: '/reportes',
        icon: ChartColumn,
        permissions: ['reports.view', 'reports.view.own'],
        feature: 'reports',
    },
];

/** True when `to` is the active route (exact match or, unless `exact`, a nested child). */
export function isNavItemActive(
    pathname: string,
    to: string,
    exact = false,
): boolean {
    const path =
        pathname.length > 1 && pathname.endsWith('/')
            ? pathname.slice(0, -1)
            : pathname;

    return path === to || (!exact && path.startsWith(`${to}/`));
}
