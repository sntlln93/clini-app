import { CLINICAL_ACCESS_REASONS } from '@/lib/clinical-access';
import { z } from 'zod';

// Mirrors `DeclareExceptionalAccessRequest` (#325): the detail is optional,
// except for «Otro», which says nothing on its own.
export const exceptionalAccessSchema = z
    .object({
        reason: z
            .union([z.enum(CLINICAL_ACCESS_REASONS), z.literal('')])
            .refine((value) => value !== '', { message: 'Elegí un motivo.' }),
        reason_detail: z
            .string()
            .trim()
            .max(500, 'Escribí 500 caracteres como máximo.'),
    })
    .superRefine((values, context) => {
        const detail = values.reason_detail;

        if (values.reason === 'other' && detail.length === 0) {
            context.addIssue({
                code: 'custom',
                path: ['reason_detail'],
                message: 'Contá el motivo en pocas palabras.',
            });
        } else if (detail.length > 0 && detail.length < 3) {
            context.addIssue({
                code: 'custom',
                path: ['reason_detail'],
                message: 'Escribí al menos 3 caracteres.',
            });
        }
    });

// The form holds '' until a reason is picked; the schema hands `onSubmit` one.
export type ExceptionalAccessFormValues = z.input<
    typeof exceptionalAccessSchema
>;

export type ExceptionalAccessFormOutput = z.output<
    typeof exceptionalAccessSchema
>;

export const EMPTY_EXCEPTIONAL_ACCESS: ExceptionalAccessFormValues = {
    reason: '',
    reason_detail: '',
};
