import { api } from '@/lib/api';
import { extractFormErrors } from '@/lib/form-errors';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

function queryKey(range: AppointmentsRange) {
    return ['appointments', range.from, range.to, range.membershipId ?? null];
}

export function useAppointments(range: AppointmentsRange) {
    return useQuery({
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
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}

export function useUpdateAppointmentStatus() {
    const queryClient = useQueryClient();

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
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return { ...mutation, message, errors };
}
