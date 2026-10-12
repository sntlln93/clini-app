import type { DocumentType } from '@/types/patient';
import { z } from 'zod';

export const bookingPatientSchema = z.object({
    patient: z
        .object({
            name: z.string().min(1, 'El nombre y apellido es obligatorio.'),
            document_type: z
                .union([z.enum(['dni', 'passport']), z.literal('')])
                .refine((value) => value !== '', {
                    message: 'Elegí un tipo de documento.',
                }),
            document_number: z
                .string()
                .min(1, 'El número de documento es obligatorio.'),
            email: z.union([
                z.string().email('El correo no es válido.'),
                z.literal(''),
            ]),
            phone: z.string(),
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
        ),
});

export type BookingPatientDraft = {
    name: string;
    document_type: DocumentType | '';
    document_number: string;
    email: string;
    phone: string;
    insurance_provider_id: number | null;
    insurance_member_number: string;
};

export type BookingPatientFormValues = {
    patient: BookingPatientDraft;
};

export const EMPTY_PATIENT_DRAFT: BookingPatientDraft = {
    name: '',
    document_type: 'dni',
    document_number: '',
    email: '',
    phone: '',
    insurance_provider_id: null,
    insurance_member_number: '',
};
