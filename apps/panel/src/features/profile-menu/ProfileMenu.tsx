import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CHROME_HOVER } from '@/features/panel-nav/NavLinks';
import { initialsOf } from '@/lib/initials';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useLogout } from './use-logout';

// The header's user menu. Its button names the user and the active
// organization, so a member of several knows where they're working; on a
// narrow screen only the avatar shows and the menu itself says both.
export function ProfileMenu() {
    const { data: user } = useSession();
    const logout = useLogout();

    const name = user?.name ?? '';
    const email = user?.email ?? '';
    const organization = user?.organization?.name ?? 'Sin consultorio';
    const initials = initialsOf(name);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        aria-label={`${name}, ${organization}`}
                        className={cn(
                            'h-auto max-w-full gap-2 py-1 pr-2 pl-1',
                            CHROME_HOVER,
                        )}
                    />
                }
            >
                <Avatar className="size-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden min-w-0 text-left leading-tight sm:grid">
                    <span className="truncate text-sm font-medium">{name}</span>
                    <span
                        className="truncate text-xs font-normal text-muted-foreground"
                        title={organization}
                    >
                        {organization}
                    </span>
                </span>
                <ChevronDown className="hidden size-4 shrink-0 sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="min-w-56"
                side="bottom"
                align="end"
                sideOffset={8}
            >
                <div className="grid min-w-0 gap-0.5 px-2 py-1.5 leading-tight">
                    <span className="truncate text-sm font-medium">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                        {email}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                        {organization}
                    </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    render={<Link to="/ajustes" />}
                    nativeButton={false}
                >
                    <Settings className="size-4" />
                    Ajustes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout.mutate()}>
                    <LogOut className="size-4" />
                    Cerrar sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
