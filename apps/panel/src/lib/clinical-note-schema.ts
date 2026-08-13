import { z } from 'zod';

// Shared by `agenda/-components/ClinicalNoteForm.tsx` and
// `pacientes/-components/AddClinicalNoteForm.tsx` (issue #217) so both entry
// points validate a note body identically.
export const noteSchema = z.object({
    body: z
        .string()
        .trim()
        .min(1, 'La nota no puede estar vacía.')
        .max(5000, 'La nota no puede superar los 5000 caracteres.'),
});

export type NoteFormValues = z.infer<typeof noteSchema>;
