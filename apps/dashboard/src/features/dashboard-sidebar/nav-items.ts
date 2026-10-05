import {
    Building2,
    ChartColumn,
    CreditCard,
    LayoutDashboard,
    ScrollText,
    Users,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type NavItem = {
    label: string;
    to: string;
    icon: ComponentType<{ className?: string }>;
};

export const navItems: NavItem[] = [
    { label: 'Resumen', to: '/', icon: LayoutDashboard },
    { label: 'Organizaciones', to: '/organizaciones', icon: Building2 },
    { label: 'Usuarios', to: '/usuarios', icon: Users },
    { label: 'Suscripciones', to: '/suscripciones', icon: CreditCard },
    { label: 'Estadísticas', to: '/estadisticas', icon: ChartColumn },
    { label: 'Auditoría', to: '/auditoria', icon: ScrollText },
];

/** True when `to` is the active route (exact match or a nested child); `/` only matches itself. */
export function isNavItemActive(pathname: string, to: string): boolean {
    if (to === '/') {
        return pathname === '/';
    }

    return pathname === to || pathname.startsWith(`${to}/`);
}
