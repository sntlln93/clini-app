import type { DocumentType } from './patient';

export type PrescriptionItem = {
    id: number;
    position: number;
    medication: string;
    presentation: string | null;
    dosage: string;
    quantity: number;
};

// A structured prescription issued during one appointment (issue #31).
// Carries everything the printable view needs, so no extra read is required.
export type Prescription = {
    id: number;
    appointment_id: number;
    patient_id: number;
    membership_id: number;
    diagnosis: string | null;
    issued_at: string;
    created_at: string;
    updated_at: string;
    items: PrescriptionItem[];
    patient_name: string | null;
    patient_document_type: DocumentType | null;
    patient_document_number: string | null;
    author_name: string | null;
    author_specialties: string[];
};

export type PrescriptionItemPayload = {
    medication: string;
    presentation: string | null;
    dosage: string;
    quantity: number;
};

export type PrescriptionPayload = {
    diagnosis: string | null;
    items: PrescriptionItemPayload[];
};
