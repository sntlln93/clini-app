import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminSession } from '@/lib/session';
import { ChevronDown, LogOut } from 'lucide-react';
import { useLogout } from './use-logout';

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

export function OperatorMenu() {
    const { data: admin } = useAdminSession();
    const logout = useLogout();

    const name = admin?.name ?? '';
    const email = admin?.email ?? '';
    const initials = getInitials(name);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        className="h-9 gap-2 px-1.5"
                        aria-label="Menú del operador"
                    >
                        <Avatar size="sm">
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="hidden max-w-40 truncate sm:inline">
                            {name}
                        </span>
                        <ChevronDown />
                    </Button>
                }
            />
            <DropdownMenuContent
                className="min-w-56"
                align="end"
                sideOffset={8}
            >
                <div className="grid min-w-0 px-2 py-1.5 leading-tight">
                    <span className="truncate text-sm font-medium">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                        {email}
                    </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout.mutate()}>
                    <LogOut />
                    Cerrar sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
