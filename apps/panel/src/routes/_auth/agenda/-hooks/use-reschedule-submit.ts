import type { ErrorCode } from '@/lib/error-codes';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { Appointment } from '@/types/appointment';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toInstant } from '../-components/agenda-dates';
import type { RescheduleFormValues } from '../-components/appointment-schemas';
import { useRescheduleAppointment } from './use-appointments';
import { useAvailabilityWarning } from './use-availability-warning';

// Only `slot_taken` maps to a field; `not_reschedulable_from_status` deliberately falls through to the general message.
const RESCHEDULE_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'appointments.slot_taken': 'start_at',
};

// Same availability check as manual booking (`AppointmentFormDialog`): a slot outside the professional's hours asks before submitting.
export function useRescheduleSubmit(
    form: UseFormReturn<RescheduleFormValues>,
    appointment: Appointment | null,
    open: boolean,
    onDone: () => void,
) {
    const [showWarning, setShowWarning] = useState(false);
    // Every agenda card mounts its (closed) dialog, so availability is only fetched once one is actually open.
    const { isOutside, isLoading: isAvailabilityLoading } =
        useAvailabilityWarning(
            open ? (appointment?.membership_id ?? null) : null,
        );
    const { mutateAsync, isPending } = useRescheduleAppointment();

    async function submit(values: RescheduleFormValues) {
        if (!appointment) {
            return;
        }

        try {
            await mutateAsync({
                appointmentId: appointment.id,
                startAt: toInstant(values.date, values.time),
            });
            onDone();
        } catch (error) {
            applyFormErrors(
                form,
                extractFormErrors(error, RESCHEDULE_FIELD_MAP),
                { start_at: 'time' },
            );
        }
    }

    function onValid(values: RescheduleFormValues) {
        // Wait for availability queries to settle; partial data would silently report "available".
        if (isAvailabilityLoading) {
            return;
        }

        if (isOutside(new Date(`${values.date}T${values.time}`))) {
            setShowWarning(true);
            return;
        }

        void submit(values);
    }

    function confirmWarning() {
        setShowWarning(false);
        void submit(form.getValues());
    }

    return {
        onValid,
        showWarning,
        setShowWarning,
        confirmWarning,
        isPending,
        isAvailabilityLoading,
    };
}
