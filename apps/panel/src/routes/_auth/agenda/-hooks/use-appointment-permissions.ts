import { useSession } from '@/lib/session';
import type { Membership } from '@/types/membership';

/**
 * Whether the signed-in user may view/create/update appointments:
 * the org-wide permission (owner/admin/staff) covers every professional,
 * while the `.own` variant only covers the professional's own membership.
 */
export function useAppointmentPermissions() {
    const { data: session } = useSession();
    const permissions = session?.permissions ?? [];

    const canViewOrgWide = permissions.includes('appointments.view');

    const isOwn = (membership: Membership): boolean =>
        membership.user.id === session?.id;

    const canView = (membership: Membership): boolean => {
        if (canViewOrgWide) {
            return true;
        }

        return (
            permissions.includes('appointments.view.own') && isOwn(membership)
        );
    };

    const canCreate = (membership: Membership): boolean => {
        if (permissions.includes('appointments.create')) {
            return true;
        }

        return (
            permissions.includes('appointments.create.own') && isOwn(membership)
        );
    };

    const canUpdate = (membership: Membership): boolean => {
        if (permissions.includes('appointments.update')) {
            return true;
        }

        return (
            permissions.includes('appointments.update.own') && isOwn(membership)
        );
    };

    return { canViewOrgWide, canView, canCreate, canUpdate };
}
