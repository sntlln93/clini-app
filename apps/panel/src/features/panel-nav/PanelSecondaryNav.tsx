import { NavLinks } from './NavLinks';
import type { SecondaryNav } from './secondary-nav';
import { useVisibleNavItems } from './use-visible-nav-items';

// A page's own navigation, a bar under the header (see `secondary-nav.ts`).
// Wide content scrolls inside it rather than the page.
export function PanelSecondaryNav({ nav }: { nav: SecondaryNav }) {
    const items = useVisibleNavItems(nav.items);

    if (items.length === 0) {
        return null;
    }

    return (
        <nav aria-label={nav.label} className="border-b bg-muted">
            <div className="mx-auto w-full max-w-screen-2xl overflow-x-auto px-4 py-2 md:px-6">
                <NavLinks items={items} orientation="horizontal" />
            </div>
        </nav>
    );
}
