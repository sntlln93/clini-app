import type { ErrorCode } from '@/lib/error-codes';
import { extractFormErrors } from '@/lib/form-errors';
import type { UseFormReturn } from 'react-hook-form';
import type { AppointmentFormValues } from './appointment-schemas';

const CREATE_APPOINTMENT_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'appointments.service_not_active_for_professional': 'service_id',
    'appointments.slot_taken': 'start_at',
};

// Maps a create-appointment error onto form fields, preserving the inline display these business rules had back when they were 422s.
export function applyAppointmentServerErrors(
    form: UseFormReturn<AppointmentFormValues>,
    error: unknown,
) {
    const { message, errors } = extractFormErrors(
        error,
        CREATE_APPOINTMENT_FIELD_MAP,
    );

    if (errors.membership_id) {
        form.setError('membershipId', { message: errors.membership_id });
    }
    if (errors.service_id) {
        form.setError('serviceId', { message: errors.service_id });
    }
    if (errors.patient_id) {
        form.setError('patientId', { message: errors.patient_id });
    }
    if (errors.start_at) {
        form.setError('time', { message: errors.start_at });
    }
    if (errors.reason) {
        form.setError('reason', { message: errors.reason });
    }
    if (message) {
        form.setError('root', { message });
    }
}
