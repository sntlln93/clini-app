import type { StatusTone } from '@/components/StatusPill';
import type { Membership, MembershipRole } from '@/types/membership';

export const ROLE_LABELS: Record<MembershipRole, string> = {
    owner: 'Propietario',
    admin: 'Administrador',
    professional: 'Profesional',
    staff: 'Personal',
};

export const STATUS_LABELS: Record<Membership['status'], string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    suspended: 'Suspendido',
};

export const STATUS_TONES: Record<Membership['status'], StatusTone> = {
    active: 'success',
    inactive: 'neutral',
    suspended: 'warning',
};
