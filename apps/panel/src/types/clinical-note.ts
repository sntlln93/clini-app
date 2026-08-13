export type ClinicalNote = {
    id: number;
    appointment_id: number;
    membership_id: number;
    body: string;
    created_at: string;
    updated_at: string;
    // Only present when the API eager-loads these relations (the
    // patient-scoped listing does; the appointment-scoped one doesn't).
    author_name?: string | null;
    appointment_date?: string | null;
};
