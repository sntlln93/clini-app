import { z } from 'zod';

export const DOCUMENT_TYPE_OPTIONS = [
    { value: 'dni' as const, label: 'DNI' },
    { value: 'passport' as const, label: 'Pasaporte' },
];

export const SEX_OPTIONS = [
    { value: 'f' as const, label: 'Femenino' },
    { value: 'm' as const, label: 'Masculino' },
    { value: 'u' as const, label: 'Sin especificar' },
];

export const patientSchema = z
    .object({
        name: z.string().min(1, 'El nombre es obligatorio.'),
        document_type: z
            .union([z.enum(['dni', 'passport']), z.literal('')])
            .refine((value) => value !== '', {
                message: 'Elegí un tipo de documento.',
            }),
        document_number: z
            .string()
            .min(1, 'El número de documento es obligatorio.'),
        contacts: z.array(
            z.object({
                type: z.enum(['phone', 'whatsapp', 'email']),
                value: z.string(),
                label: z.string(),
                needs_confirmation: z.boolean().optional(),
            }),
        ),
        sex: z.union([z.enum(['f', 'm', 'u']), z.literal('')]),
        birth_date: z.string(),
        insurance_provider_id: z.number().nullable(),
        insurance_member_number: z.string(),
    })
    .refine(
        (values) =>
            values.insurance_provider_id === null ||
            values.insurance_member_number.trim() !== '',
        {
            message: 'Ingresá el número de afiliado.',
            path: ['insurance_member_number'],
        },
    );
