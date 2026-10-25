import type { AppointmentStatus } from '@/types/appointment';
import type { ClinicalAccessTrailEntry } from '@/types/clinical-access';

// What `GET /patients/{id}/clinical-record` answers (#326, ADR 0021), the
// data the panel builds the PDF or the JSON file from (ADR 0023). Mirrors
// `ClinicalRecordExportResource` + `ClinicalRecordResource`.

export type ClinicalRecordPerson = {
    membership_id: number;
    name: string | null;
} | null;

export type ClinicalRecordHeading = {
    id: number;
    generated_at: string;
    organization: string | null;
    generated_by: ClinicalRecordPerson;
    scope: 'patient' | 'attended_patients';
    notice: string;
};

export type ClinicalRecordPatient = {
    id: number;
    name: string;
    document_type: 'dni' | 'passport';
    document_number: string;
    sex: 'f' | 'm' | 'u' | null;
    birth_date: string | null;
    insurance_provider: string | null;
    insurance_member_number: string | null;
};

export type ClinicalRecordNoteVersion = {
    version: number;
    author: ClinicalRecordPerson;
    created_at: string;
    reason: string | null;
    body: string;
    diagnoses: { code: string; description: string }[];
};

export type ClinicalRecordNote = {
    id: number;
    author: ClinicalRecordPerson;
    created_at: string;
    annulment: {
        author: ClinicalRecordPerson;
        reason: string;
        created_at: string;
    } | null;
    versions: ClinicalRecordNoteVersion[];
};

export type ClinicalRecordPrescriptionVersion = {
    version: number;
    author: ClinicalRecordPerson;
    created_at: string;
    reason: string | null;
    items: {
        medication: string;
        presentation: string | null;
        dosage: string;
        quantity: number;
    }[];
};

export type ClinicalRecordPrescription = {
    id: number;
    author: ClinicalRecordPerson;
    issued_at: string;
    created_at: string;
    annulment: {
        author: ClinicalRecordPerson;
        reason: string;
        created_at: string;
    } | null;
    versions: ClinicalRecordPrescriptionVersion[];
};

export type ClinicalRecordAppointment = {
    id: number;
    start_at: string;
    end_at: string;
    status: AppointmentStatus;
    professional: ClinicalRecordPerson;
    service: string | null;
    reason: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    clinical_notes: ClinicalRecordNote[];
    prescriptions: ClinicalRecordPrescription[];
};

export type ClinicalRecordDocument = {
    export: ClinicalRecordHeading;
    patient: ClinicalRecordPatient;
    appointments: ClinicalRecordAppointment[];
    access_log: ClinicalAccessTrailEntry[];
};
