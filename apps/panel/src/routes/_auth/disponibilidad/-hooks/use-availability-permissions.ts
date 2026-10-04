import { useSession } from '@/lib/session';
import { useSubscriptionRestricted } from '@/lib/subscription';
import type { Professional } from '@/types/professional';

/**
 * Whether the signed-in user may manage availability: `availability.manage` covers every professional, `availability.manage.own` only their own membership.
 * `canManageOrgWide` is the permission alone (it also unlocks browsing other professionals); `canWriteOrgWide` and `canManage` are also false while the subscription is expired/cancelled (#28).
 */
export function useAvailabilityPermissions() {
    const { data: session } = useSession();
    const restricted = useSubscriptionRestricted();
    const permissions = session?.permissions ?? [];

    const canManageOrgWide = permissions.includes('availability.manage');
    const canWriteOrgWide = canManageOrgWide && !restricted;

    const canManage = (membership: Professional): boolean => {
        if (restricted) {
            return false;
        }

        if (canManageOrgWide) {
            return true;
        }

        return (
            permissions.includes('availability.manage.own') &&
            membership.user.id === session?.id
        );
    };

    return { canManageOrgWide, canWriteOrgWide, canManage };
}
