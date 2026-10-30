import type {
    AllergySeverity,
    MedicalHistoryAmendmentPayload,
    MedicalHistoryCategory,
    MedicalHistoryEntry,
} from '@/types/medical-history';
import {
    ALLERGY_SEVERITIES,
    MEDICAL_HISTORY_CATEGORIES,
} from '@/types/medical-history';
import { z } from 'zod';
import { amendmentReason } from './clinical-note-schema';

// Mirrors `StoreMedicalHistoryEntryRequest::rules()` in the API — keep in
// sync. `severity` is '' while none is chosen.
export const medicalHistoryEntrySchema = z.object({
    category: z.enum(MEDICAL_HISTORY_CATEGORIES),
    description: z
        .string()
        .trim()
        .min(1, 'Completá la descripción.')
        .max(500, 'La descripción no puede superar los 500 caracteres.'),
    reaction: z
        .string()
        .trim()
        .max(255, 'La reacción no puede superar los 255 caracteres.'),
    severity: z.enum([...ALLERGY_SEVERITIES, '']),
    approximate_date: z
        .string()
        .trim()
        .max(50, 'La fecha no puede superar los 50 caracteres.'),
    reason: amendmentReason,
});

export type MedicalHistoryEntryFormValues = z.infer<
    typeof medicalHistoryEntrySchema
>;

export function emptyEntry(
    category: MedicalHistoryCategory,
): MedicalHistoryEntryFormValues {
    return {
        category,
        description: '',
        reaction: '',
        severity: '',
        approximate_date: '',
        reason: '',
    };
}

export function toEntryFormValues(
    entry: MedicalHistoryEntry,
): MedicalHistoryEntryFormValues {
    return {
        category: entry.category,
        description: entry.description,
        reaction: entry.reaction ?? '',
        severity: entry.severity ?? '',
        approximate_date: entry.approximate_date ?? '',
        reason: '',
    };
}

// Only an allergy sends a reaction and a severity, only an antecedent a date:
// the API refuses the rest (422).
export function toEntryPayload(
    values: MedicalHistoryEntryFormValues,
): MedicalHistoryAmendmentPayload & { category: MedicalHistoryCategory } {
    const allergy = values.category === 'allergy';

    return {
        category: values.category,
        description: values.description.trim(),
        reaction: allergy ? values.reaction.trim() || null : null,
        severity: allergy
            ? ((values.severity || null) as AllergySeverity | null)
            : null,
        approximate_date: allergy
            ? null
            : values.approximate_date.trim() || null,
        reason: values.reason.trim() || null,
    };
}

const FIELD_KEYS = [
    'category',
    'description',
    'reaction',
    'severity',
    'approximate_date',
    'reason',
] as const;

export function isMedicalHistoryFieldKey(
    key: string,
): key is (typeof FIELD_KEYS)[number] {
    return (FIELD_KEYS as readonly string[]).includes(key);
}
