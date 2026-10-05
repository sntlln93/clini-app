import { SidebarTrigger } from '@/components/ui/sidebar';
import { OperatorMenu } from '@/features/operator-menu/OperatorMenu';
import { useLocation } from '@tanstack/react-router';
import { isNavItemActive, navItems } from '../dashboard-sidebar/nav-items';

/** The section the current page belongs to, as a lightweight breadcrumb. */
function sectionLabel(pathname: string): string | undefined {
    return navItems.find((item) => isNavItemActive(pathname, item.to))?.label;
}

export function DashboardHeader() {
    const { pathname } = useLocation();
    const section = sectionLabel(pathname);

    return (
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger />
            {section && (
                <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {section}
                </span>
            )}
            <div className="ml-auto">
                <OperatorMenu />
            </div>
        </header>
    );
}
