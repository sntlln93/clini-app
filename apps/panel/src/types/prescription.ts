export type PrescriptionItem = {
    id: number;
    position: number;
    medication: string;
    presentation: string | null;
    dosage: string;
    quantity: number;
};

// One item list of a record: version 1 is what was recorded first, and each
// amendment adds the next one (#323).
export type PrescriptionVersion = {
    version: number;
    reason: string | null;
    created_at: string;
    items: PrescriptionItem[];
};

// The medication a professional indicated during one appointment (issue #319):
// an internal record of the clinical history, never a prescription. Append-only
// (#323): `items` are the current version's, and `versions` holds every one,
// oldest first, the current one included.
export type Prescription = {
    id: number;
    appointment_id: number;
    patient_id: number;
    membership_id: number;
    issued_at: string;
    created_at: string;
    version: number;
    amended_at: string | null;
    items: PrescriptionItem[];
    versions: PrescriptionVersion[];
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

export type PrescriptionAmendmentPayload = PrescriptionPayload & {
    reason: string | null;
};
