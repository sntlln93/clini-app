import { useWritesRestriction, type WritesRestriction } from '@/lib/plan';
import { useSession } from '@/lib/session';
import type { Professional } from '@/types/professional';

/** Why a professional's availability renders read-only, so the page can say so instead of just disabling everything. */
export type AvailabilityReadOnlyReason = WritesRestriction | 'permission';

/**
 * Whether the signed-in user may manage availability: `availability.manage` covers every professional, `availability.manage.own` only their own membership.
 * `canManageOrgWide` is the permission alone (it also unlocks browsing other professionals); `canWriteOrgWide` and `canManage` are also false while writes are restricted (#28, #237).
 */
export function useAvailabilityPermissions() {
    const { data: session } = useSession();
    const restriction = useWritesRestriction();
    const restricted = restriction !== null;
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

    const readOnlyReason = (
        membership: Professional,
    ): AvailabilityReadOnlyReason | null => {
        if (canManage(membership)) {
            return null;
        }

        return restriction ?? 'permission';
    };

    return { canManageOrgWide, canWriteOrgWide, canManage, readOnlyReason };
}
