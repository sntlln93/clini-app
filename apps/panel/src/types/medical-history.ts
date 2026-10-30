// The patient's background in the clinical history (#361, ADR 0027). Mirrors
// `App\Enums\BloodType`, `MedicalHistoryCategory` and `AllergySeverity`.
export const BLOOD_TYPES = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
] as const;

export type BloodType = (typeof BLOOD_TYPES)[number];

export const MEDICAL_HISTORY_CATEGORIES = [
    'allergy',
    'personal',
    'family',
    'surgical',
] as const;

export type MedicalHistoryCategory =
    (typeof MEDICAL_HISTORY_CATEGORIES)[number];

export const ALLERGY_SEVERITIES = ['mild', 'moderate', 'severe'] as const;

export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number];

// One recorded blood type: the newest is the current one, and changing it
// records a new one, so the earlier ones stay with their authors.
export type BloodTypeRecord = {
    id: number;
    appointment_id: number;
    membership_id: number;
    blood_type: BloodType;
    reason: string | null;
    created_at: string;
    author_name: string | null;
};

// An allergy's description is its substance; only an allergy carries a
// reaction and a severity, only an antecedent an approximate date.
export type MedicalHistoryContent = {
    description: string;
    reaction: string | null;
    severity: AllergySeverity | null;
    approximate_date: string | null;
};

export type MedicalHistoryEntryVersion = MedicalHistoryContent & {
    version: number;
    reason: string | null;
    created_at: string;
};

// One allergy or antecedent: append-only (ADR 0019), amended with a new
// version or withdrawn once it no longer applies, never erased.
export type MedicalHistoryEntry = MedicalHistoryContent & {
    id: number;
    appointment_id: number;
    patient_id: number;
    membership_id: number;
    category: MedicalHistoryCategory;
    created_at: string;
    version: number;
    amended_at: string | null;
    withdrawal: { reason: string | null; created_at: string } | null;
    versions: MedicalHistoryEntryVersion[];
    author_name: string | null;
};

// `GET /patients/{id}/medical-history`: newest first, every author's.
export type MedicalHistory = {
    blood_types: BloodTypeRecord[];
    entries: MedicalHistoryEntry[];
};

export type MedicalHistoryEntryPayload = MedicalHistoryContent & {
    category: MedicalHistoryCategory;
};

export type MedicalHistoryAmendmentPayload = MedicalHistoryContent & {
    reason: string | null;
};
