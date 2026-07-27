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
    professional_name?: string | null;
    patient_name?: string | null;
    service_name?: string | null;
};
