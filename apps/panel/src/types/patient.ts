export type DocumentType = 'dni' | 'passport' | 'insurance_id';

export type Sex = 'f' | 'm' | 'u';

export type InsuranceProvider = {
    id: number;
    name: string;
};

export type Patient = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    document_type: DocumentType;
    document_number: string;
    sex: Sex | null;
    birth_date: string | null;
    insurance_provider_id: number | null;
    insurance_provider?: InsuranceProvider | null;
    created_at: string;
};

export type PatientAppointmentStatus =
    | 'scheduled'
    | 'confirmed'
    | 'arrived'
    | 'completed'
    | 'no_show'
    | 'cancelled'
    | 'rescheduled';

// One item of a patient's appointment history (`GET /patients/{id}/appointments`).
export type PatientAppointmentHistoryItem = {
    id: number;
    membership_id: number;
    patient_id: number;
    service_id: number;
    status: PatientAppointmentStatus;
    start_at: string;
    end_at: string;
    professional_name?: string | null;
    service_name?: string | null;
    organization_name: string | null;
    // Whether the appointment belongs to the membership currently logged in.
    is_own_membership: boolean;
};

export type PatientPayload = {
    name: string;
    document_type: DocumentType | '';
    document_number: string;
    email: string;
    phone: string;
    sex: Sex | '';
    birth_date: string;
    insurance_provider_id: number | null;
};
