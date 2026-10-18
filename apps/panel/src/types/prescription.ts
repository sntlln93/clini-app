export type PrescriptionItem = {
    id: number;
    position: number;
    medication: string;
    presentation: string | null;
    dosage: string;
    quantity: number;
};

// The medication a professional indicated during one appointment (issue #319):
// an internal record of the clinical history, never a prescription.
export type Prescription = {
    id: number;
    appointment_id: number;
    patient_id: number;
    membership_id: number;
    issued_at: string;
    created_at: string;
    updated_at: string;
    items: PrescriptionItem[];
};

export type PrescriptionItemPayload = {
    medication: string;
    presentation: string | null;
    dosage: string;
    quantity: number;
};

export type PrescriptionPayload = {
    items: PrescriptionItemPayload[];
};
