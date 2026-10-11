import { z } from 'zod';

export const DOCUMENT_TYPE_OPTIONS = [
    { value: 'dni' as const, label: 'DNI' },
    { value: 'passport' as const, label: 'Pasaporte' },
    { value: 'insurance_id' as const, label: 'Carnet de obra social' },
];

export const SEX_OPTIONS = [
    { value: 'f' as const, label: 'Femenino' },
    { value: 'm' as const, label: 'Masculino' },
    { value: 'u' as const, label: 'Sin especificar' },
];

export const patientSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio.'),
    document_type: z
        .union([z.enum(['dni', 'passport', 'insurance_id']), z.literal('')])
        .refine((value) => value !== '', {
            message: 'Elegí un tipo de documento.',
        }),
    document_number: z
        .string()
        .min(1, 'El número de documento es obligatorio.'),
    email: z.string(),
    phone: z.string(),
    sex: z.union([z.enum(['f', 'm', 'u']), z.literal('')]),
    birth_date: z.string(),
    insurance_provider_id: z.number().nullable(),
});
