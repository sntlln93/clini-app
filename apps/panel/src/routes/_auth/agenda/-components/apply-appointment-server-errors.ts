import type { ErrorCode } from '@/lib/error-codes';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
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
    applyFormErrors(
        form,
        extractFormErrors(error, CREATE_APPOINTMENT_FIELD_MAP),
        {
            membership_id: 'membershipId',
            service_id: 'serviceId',
            patient_id: 'patientId',
            start_at: 'time',
            reason: 'reason',
        },
    );
}
