import type { Prescription, PrescriptionPayload } from '@/types/prescription';
import { z } from 'zod';

// Mirrors `StorePrescriptionRequest::rules()` in the API — keep in sync.
export const PRESCRIPTION_MAX_ITEMS = 20;

const itemSchema = z.object({
    medication: z
        .string()
        .trim()
        .min(1, 'Indicá el medicamento.')
        .max(255, 'El medicamento no puede superar los 255 caracteres.'),
    presentation: z
        .string()
        .trim()
        .max(255, 'La presentación no puede superar los 255 caracteres.'),
    dosage: z
        .string()
        .trim()
        .min(1, 'Indicá la posología.')
        .max(500, 'La posología no puede superar los 500 caracteres.'),
    // Kept as the raw input string so the field stays controlled; parsed on submit.
    quantity: z
        .string()
        .trim()
        .regex(/^\d+$/, 'La cantidad debe ser un número entero.')
        .refine(
            (value) => Number(value) >= 1 && Number(value) <= 999,
            'La cantidad debe estar entre 1 y 999.',
        ),
});

export const prescriptionSchema = z.object({
    diagnosis: z
        .string()
        .trim()
        .max(2000, 'El diagnóstico no puede superar los 2000 caracteres.'),
    items: z
        .array(itemSchema)
        .min(1, 'La receta debe tener al menos un medicamento.')
        .max(
            PRESCRIPTION_MAX_ITEMS,
            `La receta no puede tener más de ${PRESCRIPTION_MAX_ITEMS} medicamentos.`,
        ),
});

export type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;
export type PrescriptionItemFormValues =
    PrescriptionFormValues['items'][number];

export const EMPTY_ITEM: PrescriptionItemFormValues = {
    medication: '',
    presentation: '',
    dosage: '',
    quantity: '1',
};

export const EMPTY_PRESCRIPTION: PrescriptionFormValues = {
    diagnosis: '',
    items: [EMPTY_ITEM],
};

export function toFormValues(
    prescription: Prescription,
): PrescriptionFormValues {
    return {
        diagnosis: prescription.diagnosis ?? '',
        items: prescription.items.map((item) => ({
            medication: item.medication,
            presentation: item.presentation ?? '',
            dosage: item.dosage,
            quantity: String(item.quantity),
        })),
    };
}

export function toPayload(values: PrescriptionFormValues): PrescriptionPayload {
    const diagnosis = values.diagnosis.trim();

    return {
        diagnosis: diagnosis === '' ? null : diagnosis,
        items: values.items.map((item) => ({
            medication: item.medication.trim(),
            presentation: item.presentation.trim() || null,
            dosage: item.dosage.trim(),
            quantity: Number(item.quantity),
        })),
    };
}

// Server validation keys this form can show inline (`diagnosis`, `items.N.field`).
export function isPrescriptionFieldKey(
    key: string,
): key is
    | 'diagnosis'
    | `items.${number}.${'medication' | 'presentation' | 'dosage' | 'quantity'}` {
    return (
        key === 'diagnosis' ||
        /^items\.\d+\.(medication|presentation|dosage|quantity)$/.test(key)
    );
}
