import { api } from '@/lib/api';
import type { ErrorCode } from '@/lib/error-codes';
import { extractFormErrors } from '@/lib/form-errors';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

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

// Per-form código → campo maps: the panel showed these business rules
// inline on a field back when they were 422s (ValidationException), and the
// move to 409 domain errors preserves that display instead of degrading it
// to a toast.
const CREATE_APPOINTMENT_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'appointments.service_not_active_for_professional': 'service_id',
    'appointments.slot_taken': 'start_at',
};

const STATUS_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'appointments.status_transition_not_allowed': 'status',
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
    const queryClient = useQueryClient();
    const router = useRouter();

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            void router.invalidate();
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error, CREATE_APPOINTMENT_FIELD_MAP)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useUpdateAppointmentStatus() {
    const queryClient = useQueryClient();
    const router = useRouter();

    const mutation = useMutation({
        mutationFn: ({
            appointmentId,
            status,
        }: {
            appointmentId: number;
            status: AppointmentStatus;
        }) => api.patch(`/appointments/${appointmentId}/status`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            void router.invalidate();
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error, STATUS_FIELD_MAP)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useCancelAppointment() {
    const queryClient = useQueryClient();
    const router = useRouter();

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
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            void router.invalidate();
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error, CANCEL_FIELD_MAP)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useRescheduleAppointment() {
    const queryClient = useQueryClient();
    const router = useRouter();

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            void router.invalidate();
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error, RESCHEDULE_FIELD_MAP)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
