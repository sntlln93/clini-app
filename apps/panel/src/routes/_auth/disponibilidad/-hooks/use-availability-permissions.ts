import { useSession } from '@/lib/session';
import type { Membership } from '@/types/membership';

/** Whether the signed-in user may manage availability: `availability.manage` covers every professional, `availability.manage.own` only their own membership. */
export function useAvailabilityPermissions() {
    const { data: session } = useSession();
    const permissions = session?.permissions ?? [];

    const canManageOrgWide = permissions.includes('availability.manage');

    const canManage = (membership: Membership): boolean => {
        if (canManageOrgWide) {
            return true;
        }

        return (
            permissions.includes('availability.manage.own') &&
            membership.user.id === session?.id
        );
    };

    return { canManageOrgWide, canManage };
}
