import { z } from 'zod';

const body = z
    .string()
    .trim()
    .min(1, 'La nota no puede estar vacía.')
    .max(5000, 'La nota no puede superar los 5000 caracteres.');

// Mirrors `StoreClinicalNoteRequest::MAX_DIAGNOSES` in the API (#324).
export const MAX_DIAGNOSES = 10;

// The selected ICD-10 codes, in the order they were added; only their ids
// go to the API.
const diagnoses = z
    .array(
        z.object({
            icd10_code_id: z.number(),
            code: z.string(),
            description: z.string(),
        }),
    )
    .max(MAX_DIAGNOSES, `Una nota admite hasta ${MAX_DIAGNOSES} diagnósticos.`);

// `body` and `diagnoses` are shared by `agenda/-components/ClinicalNoteForm.tsx`
// and `pacientes/-components/AddClinicalNoteForm.tsx` (issues #217, #324) so
// both entry points validate a note identically.
export const noteSchema = z.object({ body, diagnoses });

export type NoteFormValues = z.infer<typeof noteSchema>;

// Mirrors `AmendClinicalNoteRequest::rules()` in the API (#323, #324): the new
// text and diagnoses plus an optional reason.
export const amendmentReason = z
    .string()
    .trim()
    .max(500, 'El motivo no puede superar los 500 caracteres.');

export const noteAmendmentSchema = z.object({
    body,
    diagnoses,
    reason: amendmentReason,
});

export type NoteAmendmentFormValues = z.infer<typeof noteAmendmentSchema>;
