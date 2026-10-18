import { z } from 'zod';

const body = z
    .string()
    .trim()
    .min(1, 'La nota no puede estar vacía.')
    .max(5000, 'La nota no puede superar los 5000 caracteres.');

// `body` is shared by `agenda/-components/ClinicalNoteForm.tsx` and
// `pacientes/-components/AddClinicalNoteForm.tsx` (issue #217) so both entry
// points validate a note body identically.
export const noteSchema = z.object({ body });

export type NoteFormValues = z.infer<typeof noteSchema>;

// Mirrors `AmendClinicalNoteRequest::rules()` in the API (#323): the new text
// plus an optional reason.
export const amendmentReason = z
    .string()
    .trim()
    .max(500, 'El motivo no puede superar los 500 caracteres.');

export const noteAmendmentSchema = z.object({ body, reason: amendmentReason });

export type NoteAmendmentFormValues = z.infer<typeof noteAmendmentSchema>;
