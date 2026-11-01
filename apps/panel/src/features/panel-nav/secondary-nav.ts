import { useMatches } from '@tanstack/react-router';
import type { NavItem } from './nav-items';

declare module '@tanstack/react-router' {
    interface StaticDataRouteOption {
        /**
         * A page's own navigation, shown as a second bar under the header for
         * the route and every route below it (the deepest one that declares it
         * wins). Its items follow the same permission and plan rules as the
         * main navigation.
         */
        secondaryNav?: SecondaryNav;
    }
}

export type SecondaryNav = {
    /** The bar's accessible name, e.g. «Secciones de Ajustes». */
    label: string;
    items: NavItem[];
};

/** The secondary navigation the current route declares, if any. */
export function useSecondaryNav(): SecondaryNav | undefined {
    return useMatches({
        select: (matches) =>
            matches.findLast((match) => match.staticData.secondaryNav)
                ?.staticData.secondaryNav,
    });
}
