import { z } from 'zod';

import type { MembershipRole, MembershipStatus } from '@/types/membership';

type MemberOption<TValue> = {
    value: TValue;
    label: string;
    description: string;
};

// Descriptions mirror the backend role presets (`App\Enums\MembershipRole::permissions()`); keep them in sync.
export const ROLE_OPTIONS: MemberOption<MembershipRole>[] = [
    {
        value: 'owner',
        label: 'Propietario',
        description: 'Control total del consultorio, incluida la suscripción.',
    },
    {
        value: 'admin',
        label: 'Administrador',
        description:
            'Gestiona miembros, agenda, pacientes, disponibilidad y ajustes. No gestiona la suscripción.',
    },
    {
        value: 'professional',
        label: 'Profesional',
        description:
            'Atiende pacientes y gestiona su propia agenda, disponibilidad y servicios.',
    },
    {
        value: 'staff',
        label: 'Personal',
        description:
            'Recepción: carga pacientes y turnos de todos los profesionales y gestiona su disponibilidad.',
    },
];

// The backend treats `inactive` and `suspended` alike (no access), so these only describe intent.
export const STATUS_OPTIONS: MemberOption<MembershipStatus>[] = [
    {
        value: 'active',
        label: 'Activo',
        description: 'Puede ingresar al panel y trabajar normalmente.',
    },
    {
        value: 'inactive',
        label: 'Inactivo',
        description:
            'Sin acceso por un tiempo, por ejemplo durante una licencia.',
    },
    {
        value: 'suspended',
        label: 'Suspendido',
        description: 'Sin acceso por una decisión administrativa.',
    },
];

const roleSchema = z.enum(['owner', 'admin', 'professional', 'staff']);
const statusSchema = z.enum(['active', 'inactive', 'suspended']);

export const inviteMemberSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo es obligatorio.')
        .email('El correo no es válido.'),
    roles: z.array(roleSchema).min(1, 'Seleccioná al menos un rol.'),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

export const memberEditSchema = z.object({
    roles: z.array(roleSchema).min(1, 'Seleccioná al menos un rol.'),
    status: statusSchema,
});

export type MemberEditFormValues = z.infer<typeof memberEditSchema>;
