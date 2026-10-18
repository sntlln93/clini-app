// One text of a note: version 1 is what was written first, and each
// amendment adds the next one (#323).
export type ClinicalNoteVersion = {
    version: number;
    body: string;
    reason: string | null;
    created_at: string;
};

export type ClinicalNoteAnnulment = {
    reason: string;
    created_at: string;
};

// Append-only (#323): `body` is the current version's text, and `versions`
// holds every one, oldest first, the current one included.
export type ClinicalNote = {
    id: number;
    appointment_id: number;
    membership_id: number;
    body: string;
    version: number;
    created_at: string;
    amended_at: string | null;
    annulment: ClinicalNoteAnnulment | null;
    versions: ClinicalNoteVersion[];
    // Only present when the API eager-loads these relations (the
    // patient-scoped listing does; the appointment-scoped one doesn't).
    author_name?: string | null;
    appointment_date?: string | null;
};
