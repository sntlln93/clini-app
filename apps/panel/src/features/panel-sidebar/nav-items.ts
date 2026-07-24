import { Calendar, Clock, Stethoscope, Users } from 'lucide-react';
import type { ComponentType } from 'react';

export type NavItem = {
    label: string;
    to: string;
    icon: ComponentType<{ className?: string }>;
};

export const navItems: NavItem[] = [
    { label: 'Agenda', to: '/agenda', icon: Calendar },
    { label: 'Pacientes', to: '/pacientes', icon: Users },
    { label: 'Profesionales', to: '/profesionales', icon: Stethoscope },
    { label: 'Disponibilidad', to: '/disponibilidad', icon: Clock },
];

/** True when `to` is the active route (exact match or a nested child). */
export function isNavItemActive(pathname: string, to: string): boolean {
    return pathname === to || pathname.startsWith(`${to}/`);
}
