import { useSession } from '@/lib/session';
import type { Membership } from '@/types/membership';

/**
 * Whether the signed-in user may edit a professional's catalog assignments
 * (services/specialties): the org-wide `catalog.manage` permission (owner/
 * admin) covers every professional, while `catalog.manage.own` only covers
 * the professional's own membership.
 */
export function useCanManageProfessionalCatalog() {
    const { data: session } = useSession();
    const permissions = session?.permissions ?? [];

    return (membership: Membership): boolean => {
        if (permissions.includes('catalog.manage')) {
            return true;
        }

        return (
            permissions.includes('catalog.manage.own') &&
            membership.user.id === session?.id
        );
    };
}
