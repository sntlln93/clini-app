export const APPOINTMENT_STATUSES = [
    'scheduled',
    'confirmed',
    'arrived',
    'completed',
    'no_show',
    'cancelled',
    'rescheduled',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_ORIGINS = ['online', 'manual'] as const;
export type AppointmentOrigin = (typeof APPOINTMENT_ORIGINS)[number];

export const REMINDER_STATUSES = [
    'pending',
    'queued',
    'sent',
    'failed',
] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const REMINDER_CHANNELS = ['email', 'sms', 'whatsapp'] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

export type AppointmentsPerDay = {
    date: string;
    total: number;
    online: number;
    manual: number;
};

/** Contract §3.8. Rates are 0..1 floats, `null` when the denominator is 0. */
export type PlatformStats = {
    period: {
        from: string;
        to: string;
        timezone: string;
        organization: { id: number; name: string } | null;
    };
    appointments: {
        total: number;
        by_status: Record<AppointmentStatus, number>;
        by_origin: Record<AppointmentOrigin, number>;
        cancellation_rate: number | null;
        no_show_rate: number | null;
        per_day: AppointmentsPerDay[];
    };
    patients: { new: number; per_day: Array<{ date: string; count: number }> };
    reminders: {
        total: number;
        by_status: Record<ReminderStatus, number>;
        by_channel: Record<ReminderChannel, number>;
        failure_rate: number | null;
    };
};
