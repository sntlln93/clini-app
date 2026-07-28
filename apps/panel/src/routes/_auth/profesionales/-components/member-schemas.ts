import { z } from 'zod';

import type { MembershipRole, MembershipStatus } from '@/types/membership';

export const ROLE_OPTIONS: { value: MembershipRole; label: string }[] = [
    { value: 'owner', label: 'Propietario' },
    { value: 'admin', label: 'Administrador' },
    { value: 'professional', label: 'Profesional' },
    { value: 'staff', label: 'Personal' },
];

export const STATUS_OPTIONS: { value: MembershipStatus; label: string }[] = [
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'suspended', label: 'Suspendido' },
];

const roleSchema = z.enum(['owner', 'admin', 'professional', 'staff']);
const statusSchema = z.enum(['active', 'inactive', 'suspended']);

export const inviteMemberSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo es obligatorio.')
        .email('El correo no es válido.'),
    roles: z.array(roleSchema).min(1, 'Debe seleccionar al menos un rol.'),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

export const memberEditSchema = z.object({
    roles: z.array(roleSchema).min(1, 'Debe seleccionar al menos un rol.'),
    status: statusSchema,
});

export type MemberEditFormValues = z.infer<typeof memberEditSchema>;
