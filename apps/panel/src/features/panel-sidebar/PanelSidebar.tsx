import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ProfileMenu } from '@/features/profile-menu/ProfileMenu';
import { useSession } from '@/lib/session';
import { Link, useLocation } from '@tanstack/react-router';
import { Stethoscope } from 'lucide-react';
import { isNavItemActive, navItems } from './nav-items';

export function PanelSidebar() {
    const { pathname } = useLocation();
    const { data: session } = useSession();
    const permissions = session?.permissions ?? [];
    const visibleNavItems = navItems.filter(
        (item) => !item.permission || permissions.includes(item.permission),
    );

    // `role`/`aria-label` land on Sidebar's container div, which also wraps the header logo and footer ProfileMenu — not just the `<nav>` below — so axe's `region` rule would otherwise flag that content as outside any landmark.
    // The label must stay distinct from the nested "Navegación principal" one.
    return (
        <Sidebar
            collapsible="icon"
            role="navigation"
            aria-label="Barra lateral"
        >
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-1.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Stethoscope className="size-4" />
                    </span>
                    <span className="truncate text-base font-semibold group-data-[collapsible=icon]:hidden">
                        Clini
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <nav aria-label="Navegación principal">
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {visibleNavItems.map((item) => {
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
            <SidebarFooter>
                <ProfileMenu />
            </SidebarFooter>
        </Sidebar>
    );
}
