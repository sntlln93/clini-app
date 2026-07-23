import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { Link } from '@tanstack/react-router';
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react';

// Placeholder identity until the auth issue lands. `Cerrar sesión` is inert.
const PROFILE = {
    name: 'Dra. Ana Ejemplo',
    email: 'ana@clini.app',
    initials: 'AE',
};

export function ProfileMenu() {
    const { isMobile } = useSidebar();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <SidebarMenuButton
                                size="lg"
                                tooltip={PROFILE.name}
                                className="data-popup-open:bg-sidebar-accent"
                            >
                                <Avatar className="size-8 rounded-lg">
                                    <AvatarFallback className="rounded-lg">
                                        {PROFILE.initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid min-w-0 flex-1 text-left leading-tight">
                                    <span className="truncate text-sm font-medium">
                                        {PROFILE.name}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {PROFILE.email}
                                    </span>
                                </div>
                                <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                            </SidebarMenuButton>
                        }
                    />
                    <DropdownMenuContent
                        className="min-w-56"
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        sideOffset={8}
                    >
                        <div className="flex items-center gap-2 px-2 py-1.5">
                            <Avatar className="size-8 rounded-lg">
                                <AvatarFallback className="rounded-lg">
                                    {PROFILE.initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid min-w-0 flex-1 leading-tight">
                                <span className="truncate text-sm font-medium">
                                    {PROFILE.name}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {PROFILE.email}
                                </span>
                            </div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem render={<Link to="/ajustes" />}>
                            <Settings className="size-4" />
                            Ajustes
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                            <LogOut className="size-4" />
                            Cerrar sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
