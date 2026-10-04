import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import type { ErrorCode } from '@/lib/error-codes';
import { extractFormErrors } from '@/lib/form-errors';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { queryOptions, useMutation } from '@tanstack/react-query';
import { formatAppointmentMoment } from '../-components/appointment-format';
import { STATUS_SUCCESS_MESSAGES } from '../-components/appointment-status';

type AppointmentsRange = {
    from: string;
    to: string;
    membershipId?: number;
};

type CreateAppointmentPayload = {
    membershipId: number;
    patientId: number;
    serviceId: number;
    startAt: string;
    reason: string | null;
    notes: string | null;
};

// Preserves the inline field display these rules had back when they were 422s, instead of degrading to a toast.
const CREATE_APPOINTMENT_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'appointments.service_not_active_for_professional': 'service_id',
    'appointments.slot_taken': 'start_at',
};

const CANCEL_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'appointments.not_cancellable_from_status': 'status',
};

const RESCHEDULE_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'appointments.not_reschedulable_from_status': 'status',
    'appointments.slot_taken': 'start_at',
};

function queryKey(range: AppointmentsRange) {
    return ['appointments', range.from, range.to, range.membershipId ?? null];
}

export function appointmentsQueryOptions(range: AppointmentsRange) {
    return queryOptions({
        queryKey: queryKey(range),
        queryFn: () =>
            api
                .get<{ data: Appointment[] }>('/appointments', {
                    params: {
                        from: range.from,
                        to: range.to,
                        membership_id: range.membershipId,
                    },
                })
                .then((response) => response.data.data),
    });
}

export function useCreateAppointment() {
    const refreshPageData = useRefreshPageData();

    const mutation = useMutation({
        mutationFn: (payload: CreateAppointmentPayload) =>
            api.post('/appointments', {
                membership_id: payload.membershipId,
                patient_id: payload.patientId,
                service_id: payload.serviceId,
                start_at: payload.startAt,
                reason: payload.reason,
                notes: payload.notes,
            }),
        onSuccess: (_data, payload) => {
            notifySuccess(
                `Turno creado para el ${formatAppointmentMoment(payload.startAt)}.`,
            );
            return refreshPageData(['appointments']);
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error, CREATE_APPOINTMENT_FIELD_MAP)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useUpdateAppointmentStatus() {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: ({
            appointmentId,
            status,
        }: {
            appointmentId: number;
            status: AppointmentStatus;
        }) => api.patch(`/appointments/${appointmentId}/status`, { status }),
        // Status changes start from a dropdown item with no form to hold an inline error, so both outcomes surface as toasts.
        onSuccess: async (_data, { status }) => {
            await refreshPageData(['appointments']);
            notifySuccess(
                STATUS_SUCCESS_MESSAGES[status] ?? 'Turno actualizado.',
            );
        },
        onError: (error) =>
            notifyError(error, 'No se pudo actualizar el estado del turno.'),
    });
}

export function useCancelAppointment() {
    const refreshPageData = useRefreshPageData();

    const mutation = useMutation({
        mutationFn: ({
            appointmentId,
            cancellationReason,
        }: {
            appointmentId: number;
            cancellationReason?: string | null;
        }) =>
            api.patch(`/appointments/${appointmentId}/cancel`, {
                cancellation_reason: cancellationReason ?? null,
            }),
        onSuccess: () => {
            notifySuccess('Turno cancelado.');
            return refreshPageData(['appointments']);
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error, CANCEL_FIELD_MAP)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useRescheduleAppointment() {
    const refreshPageData = useRefreshPageData();

    const mutation = useMutation({
        mutationFn: ({
            appointmentId,
            startAt,
            reason,
            notes,
        }: {
            appointmentId: number;
            startAt: string;
            reason?: string | null;
            notes?: string | null;
        }) =>
            api.post(`/appointments/${appointmentId}/reschedule`, {
                start_at: startAt,
                reason: reason ?? null,
                notes: notes ?? null,
            }),
        onSuccess: (_data, { startAt }) => {
            notifySuccess(
                `Turno reprogramado para el ${formatAppointmentMoment(startAt)}.`,
            );
            return refreshPageData(['appointments']);
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error, RESCHEDULE_FIELD_MAP)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
