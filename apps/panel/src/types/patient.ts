import type { AppointmentOrigin, AppointmentStatus } from './appointment';

export type DocumentType = 'dni' | 'passport';

export type Sex = 'f' | 'm' | 'u';

export type InsuranceProvider = {
    id: number;
    name: string;
};

export type PatientContactType = 'phone' | 'whatsapp' | 'email';

// `value` is normalized (E.164 for numbers); `display` is how a person reads
// it. An anonymous online booking's contact waits for the practice to confirm
// it before a reminder goes there (#365).
export type PatientContact = {
    id: number;
    type: PatientContactType;
    value: string;
    display: string;
    label: string | null;
    needs_confirmation: boolean;
};

// One row of the contacts editor, and of the payload once its empty rows are dropped.
// `needs_confirmation` only marks a saved row in the editor; it isn't sent.
export type PatientContactDraft = {
    type: PatientContactType;
    value: string;
    label: string;
    needs_confirmation?: boolean;
};

export type Patient = {
    id: number;
    name: string;
    contacts: PatientContact[];
    document_type: DocumentType;
    document_number: string;
    sex: Sex | null;
    birth_date: string | null;
    insurance_provider_id: number | null;
    insurance_member_number: string | null;
    insurance_provider?: InsuranceProvider | null;
    created_at: string;
};

// `GET /patients/{id}`, the patient's own page: whether the acting membership
// may read the clinical history, and whether reading it now takes a reason
// (#325), so the panel never finds out through a 403 or a 409; and whether
// another professional's records stay out of it until the patient shares
// their code (#364).
export type PatientDetail = Patient & {
    can_view_clinical_notes: boolean;
    clinical_access_reason_required: boolean;
    clinical_records_hidden: boolean;
};

// One item of a patient's appointment history (`GET /patients/{id}/appointments`).
export type PatientAppointmentHistoryItem = {
    id: number;
    membership_id: number;
    patient_id: number;
    service_id: number;
    status: AppointmentStatus;
    origin: AppointmentOrigin;
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
    contacts: PatientContactDraft[];
    sex: Sex | '';
    birth_date: string;
    insurance_provider_id: number | null;
    // Ignored by the API when there is no provider (#275).
    insurance_member_number: string;
};
