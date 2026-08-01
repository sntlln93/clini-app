import type { DocumentType } from '@/types/patient';
import { z } from 'zod';

export const bookingPatientSchema = z.object({
    patient: z.object({
        name: z.string().min(1, 'El nombre es obligatorio.'),
        document_type: z
            .union([z.enum(['dni', 'passport', 'insurance_id']), z.literal('')])
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
    }),
});

export type BookingPatientFormValues = {
    patient: {
        name: string;
        document_type: DocumentType | '';
        document_number: string;
        email: string;
        phone: string;
    };
};
