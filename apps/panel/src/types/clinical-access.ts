import type {
    ClinicalAccessAction,
    ClinicalAccessReason,
} from '@/lib/clinical-access';

// One row of `GET /exceptional-accesses`, the owner's list (#325): who opened
// which patient's history without an appointment near today, why and when.
// Never the professional's own words nor anything clinical.
export type ExceptionalAccess = {
    id: number;
    created_at: string;
    professional: {
        membership_id: number;
        name: string | null;
    };
    patient: {
        id: number;
        name: string | null;
    };
    reason: ClinicalAccessReason;
};

// One row of `GET /patients/{id}/clinical-access-logs`, a patient's trail as
// whoever reads their history sees it (#325): who, what, when and what it
// touched. The reason is the listed one, never the professional's words.
export type ClinicalAccessTrailEntry = {
    id: number;
    created_at: string;
    action: ClinicalAccessAction;
    professional: {
        membership_id: number;
        name: string | null;
    };
    reason: ClinicalAccessReason | null;
    appointment: { id: number; start_at: string } | null;
    clinical_note_id: number | null;
    prescription_id: number | null;
    vital_sign_id: number | null;
    blood_type_record_id: number | null;
    medical_history_entry_id: number | null;
    export: {
        id: number;
        scope: 'patient' | 'attended_patients';
        format: 'pdf' | 'json';
    } | null;
};
