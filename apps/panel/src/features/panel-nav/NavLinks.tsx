import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, useLocation } from '@tanstack/react-router';
import { isNavItemActive, type NavItem } from './nav-items';

/** A ghost control's hover on the `bg-muted` header, where `hover:bg-muted` wouldn't show. */
export const CHROME_HOVER =
    'hover:bg-background aria-expanded:bg-background dark:hover:bg-background';

type NavLinksProps = {
    items: NavItem[];
    orientation: 'horizontal' | 'vertical';
    onNavigate?: () => void;
};

// The links of a navigation bar, the current page marked with
// `aria-current="page"`. Horizontal in the header and the secondary bar,
// vertical in the mobile menu.
export function NavLinks({ items, orientation, onNavigate }: NavLinksProps) {
    const { pathname } = useLocation();

    return (
        <ul
            className={cn(
                'flex gap-1',
                orientation === 'vertical' ? 'flex-col' : 'items-center',
            )}
        >
            {items.map((item) => {
                const active = isNavItemActive(pathname, item.to);

                return (
                    <li key={item.to}>
                        <Link
                            to={item.to}
                            onClick={onNavigate}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                buttonVariants({ variant: 'ghost' }),
                                'text-muted-foreground aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground',
                                // The bars sit on `bg-muted`, the ghost
                                // hover's own color: hover lifts to the page's.
                                orientation === 'vertical'
                                    ? 'h-10 w-full justify-start px-3'
                                    : CHROME_HOVER,
                            )}
                        >
                            {item.icon && (
                                <item.icon data-icon="inline-start" />
                            )}
                            {item.label}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
