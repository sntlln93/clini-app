// An ICD-10 diagnosis as the version was written with it (#324): its code
// and description never follow later catalog changes.
export type ClinicalNoteDiagnosis = {
    icd10_code_id: number;
    code: string;
    description: string;
};

// One text of a note and its diagnoses: version 1 is what was written first,
// and each amendment adds the next one (#323).
export type ClinicalNoteVersion = {
    version: number;
    body: string;
    diagnoses: ClinicalNoteDiagnosis[];
    reason: string | null;
    created_at: string;
};

export type ClinicalNoteAnnulment = {
    reason: string;
    created_at: string;
};

// Append-only (#323): `body` and `diagnoses` are the current version's, and
// `versions` holds every one, oldest first, the current one included.
export type ClinicalNote = {
    id: number;
    appointment_id: number;
    membership_id: number;
    body: string;
    diagnoses: ClinicalNoteDiagnosis[];
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

// What a new note or an amendment sends: the text and the ICD-10 code ids,
// in order (#324).
export type NoteDraft = {
    body: string;
    icd10CodeIds: number[];
};
