import { useSession } from '@/lib/session';
import type { Membership } from '@/types/membership';

/** Whether the user may edit a professional's catalog: `catalog.manage` covers all, `catalog.manage.own` only their own membership. */
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
