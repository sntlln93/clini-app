import { BrandMark } from '@/components/BrandMark';
import { NavLinks } from '@/features/panel-nav/NavLinks';
import { PanelMobileNav } from '@/features/panel-nav/PanelMobileNav';
import { navItems } from '@/features/panel-nav/nav-items';
import { useVisibleNavItems } from '@/features/panel-nav/use-visible-nav-items';
import { ProfileMenu } from '@/features/profile-menu/ProfileMenu';
import { brand } from '@clini/brand';
import { Link } from '@tanstack/react-router';

// [logo] [navigation] [user menu]. Below `lg` the navigation moves into a
// drawer opened from the menu button.
export function PanelHeader() {
    const items = useVisibleNavItems(navItems);

    return (
        <header className="sticky top-0 z-20 border-b bg-muted">
            <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-2 px-4 md:px-6 lg:gap-6">
                <PanelMobileNav />
                <Link
                    to="/"
                    className="flex shrink-0 items-center gap-2 rounded-md focus-ring"
                >
                    <BrandMark />
                    <span className="text-base font-semibold">
                        {brand.name}
                    </span>
                </Link>
                <nav
                    aria-label="Navegación principal"
                    className="hidden min-w-0 lg:block"
                >
                    <NavLinks items={items} orientation="horizontal" />
                </nav>
                <div className="ml-auto min-w-0">
                    <ProfileMenu />
                </div>
            </div>
        </header>
    );
}
