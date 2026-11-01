import { planIncludes, usePlan } from '@/lib/plan';
import { useSession } from '@/lib/session';
import type { NavItem } from './nav-items';

/** The items the session's permissions and the organization's plan allow. */
export function useVisibleNavItems(items: NavItem[]): NavItem[] {
    const { data: session } = useSession();
    const permissions = session?.permissions ?? [];
    const plan = usePlan();

    return items.filter(
        (item) =>
            (!item.permissions ||
                item.permissions.some((permission) =>
                    permissions.includes(permission),
                )) &&
            (!item.feature || planIncludes(plan, item.feature)),
    );
}
