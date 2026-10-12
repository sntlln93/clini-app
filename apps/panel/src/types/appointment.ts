export type AppointmentStatus =
    | 'scheduled'
    | 'confirmed'
    | 'arrived'
    | 'completed'
    | 'no_show'
    | 'cancelled'
    | 'rescheduled';

export type AppointmentOrigin = 'online' | 'manual';

export type Appointment = {
    id: number;
    membership_id: number;
    patient_id: number;
    service_id: number;
    status: AppointmentStatus;
    origin: AppointmentOrigin;
    start_at: string;
    end_at: string;
    reason: string | null;
    notes: string | null;
    arrived_at: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    rescheduled_from_id: number | null;
    /** What the patient reported when booking online (#291); the patient's own record may differ. */
    reported_insurance_provider_id: number | null;
    reported_insurance_member_number: string | null;
    reported_insurance_provider_name?: string | null;
    professional_name?: string | null;
    patient_name?: string | null;
    service_name?: string | null;
};
