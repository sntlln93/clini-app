import { reasonSchema } from '@/features/reason-dialog/ReasonDialog';
import { PRESCRIPTION_ANNULMENT_KINDS } from '@/lib/prescription-annulment';
import { z } from 'zod';

// Mirrors `AnnulPrescriptionRequest` (#344): whether it is no longer needed or
// never was, and a reason with the same limits as annulling a note.
export const annulPrescriptionSchema = z.object({
    kind: z
        .union([z.enum(PRESCRIPTION_ANNULMENT_KINDS), z.literal('')])
        .refine((value) => value !== '', {
            message: 'Elegí si ya no es necesaria o si nunca lo fue.',
        }),
    reason: reasonSchema.shape.reason,
});

// The form holds '' until a kind is picked; the schema hands `onSubmit` one.
export type AnnulPrescriptionFormValues = z.input<
    typeof annulPrescriptionSchema
>;

export type AnnulPrescriptionFormOutput = z.output<
    typeof annulPrescriptionSchema
>;

export const EMPTY_ANNUL_PRESCRIPTION: AnnulPrescriptionFormValues = {
    kind: '',
    reason: '',
};
