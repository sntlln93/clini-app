import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';
import { Link, useLocation } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { isNavItemActive, navItems } from './nav-items';

export function DashboardSidebar() {
    const { pathname } = useLocation();
    const { isMobile, setOpenMobile } = useSidebar();
    // The mobile drawer would otherwise stay open over the new page.
    const closeMobileDrawer = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    // `role`/`aria-label` land on Sidebar's container div, which also wraps the header logo — not just the `<nav>` below — so axe's `region` rule doesn't flag it.
    return (
        <Sidebar
            collapsible="icon"
            role="navigation"
            aria-label="Barra lateral"
        >
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-1.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ShieldCheck className="size-4" />
                    </span>
                    <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate text-base font-semibold">
                            Clini
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                            Plataforma
                        </span>
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <nav aria-label="Navegación principal">
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {navItems.map((item) => {
                                    const active = isNavItemActive(
                                        pathname,
                                        item.to,
                                    );
                                    return (
                                        <SidebarMenuItem key={item.to}>
                                            <SidebarMenuButton
                                                isActive={active}
                                                tooltip={item.label}
                                                render={
                                                    <Link
                                                        to={item.to}
                                                        onClick={
                                                            closeMobileDrawer
                                                        }
                                                        aria-current={
                                                            active
                                                                ? 'page'
                                                                : undefined
                                                        }
                                                    >
                                                        <item.icon className="size-4" />
                                                        <span>
                                                            {item.label}
                                                        </span>
                                                    </Link>
                                                }
                                            />
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </nav>
            </SidebarContent>
            {!isMobile && (
                <SidebarRail
                    aria-label="Alternar barra lateral"
                    title="Alternar barra lateral"
                />
            )}
        </Sidebar>
    );
}
