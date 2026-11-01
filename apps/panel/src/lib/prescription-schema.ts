import type { PickedMedication } from '@/types/medication';
import type {
    Prescription,
    PrescriptionAmendmentPayload,
    PrescriptionItem,
} from '@/types/prescription';
import { z } from 'zod';
import { amendmentReason } from './clinical-note-schema';

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
    // The catalog product it was picked from (#377), null for free text:
    // typing in «Medicamento» drops it. Only its GTIN goes out.
    catalog: z
        .object({
            gtin: z.string(),
            substances: z.array(z.string()),
            dispensing_condition: z.string().nullable(),
            control_mark: z.string().nullable(),
            composition_incomplete: z.boolean(),
        })
        .nullable(),
});

// `reason` only goes out with an amendment (#323); recording one ignores it.
export const prescriptionSchema = z.object({
    reason: amendmentReason,
    items: z
        .array(itemSchema)
        .min(1, 'Indicá al menos un medicamento.')
        .max(
            PRESCRIPTION_MAX_ITEMS,
            `No podés indicar más de ${PRESCRIPTION_MAX_ITEMS} medicamentos.`,
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
    catalog: null,
};

export const EMPTY_PRESCRIPTION: PrescriptionFormValues = {
    reason: '',
    items: [EMPTY_ITEM],
};

// An amended item keeps its product, as its snapshot copied it.
function pickedFromItem(item: PrescriptionItem): PickedMedication | null {
    if (item.gtin === null) {
        return null;
    }

    return {
        gtin: item.gtin,
        substances: item.substances ?? [],
        dispensing_condition: item.dispensing_condition,
        control_mark: item.control_mark,
        composition_incomplete: item.composition_incomplete === true,
    };
}

export function toFormValues(
    prescription: Prescription,
): PrescriptionFormValues {
    return {
        reason: '',
        items: prescription.items.map((item) => ({
            medication: item.medication,
            presentation: item.presentation ?? '',
            dosage: item.dosage,
            quantity: String(item.quantity),
            catalog: pickedFromItem(item),
        })),
    };
}

export function toPayload(
    values: PrescriptionFormValues,
): PrescriptionAmendmentPayload {
    return {
        reason: values.reason.trim() || null,
        items: values.items.map((item) => ({
            medication: item.medication.trim(),
            presentation: item.presentation.trim() || null,
            dosage: item.dosage.trim(),
            quantity: Number(item.quantity),
            gtin: item.catalog?.gtin ?? null,
        })),
    };
}

// Server validation keys this form can show inline (`reason`, `items.N.field`).
export function isPrescriptionFieldKey(
    key: string,
): key is
    | 'reason'
    | `items.${number}.${'medication' | 'presentation' | 'dosage' | 'quantity'}` {
    return (
        key === 'reason' ||
        /^items\.\d+\.(medication|presentation|dosage|quantity)$/.test(key)
    );
}
