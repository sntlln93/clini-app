import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { useUpdateAppointmentStatus } from '../-hooks/use-appointments';
import { STATUS_ACTION_LABELS, STATUS_LABELS } from './appointment-status';

type AppointmentStatusActionsProps = {
    appointment: Appointment;
    statuses: AppointmentStatus[];
    /** `no_show` is irreversible, so it asks for confirmation instead of applying on click. */
    onNoShowRequest: () => void;
};

export function AppointmentStatusActions({
    appointment,
    statuses,
    onNoShowRequest,
}: AppointmentStatusActionsProps) {
    const { mutate } = useUpdateAppointmentStatus();

    return statuses.map((status) =>
        status === 'no_show' ? (
            <DropdownMenuItem
                key={status}
                variant="destructive"
                onClick={onNoShowRequest}
            >
                {STATUS_ACTION_LABELS[status]}
            </DropdownMenuItem>
        ) : (
            <DropdownMenuItem
                key={status}
                onClick={() =>
                    mutate({ appointmentId: appointment.id, status })
                }
            >
                {STATUS_ACTION_LABELS[status] ?? STATUS_LABELS[status]}
            </DropdownMenuItem>
        ),
    );
}

type NoShowConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment;
};

export function NoShowConfirmDialog({
    open,
    onOpenChange,
    appointment,
}: NoShowConfirmDialogProps) {
    const { mutate, isPending } = useUpdateAppointmentStatus();

    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            title="¿Marcar al paciente como ausente?"
            description="Esta acción no se puede deshacer: el turno va a quedar como ausente."
            confirmLabel="Marcar ausente"
            isPending={isPending}
            // `AlertDialogAction` is a Close part: the dialog closes on click, and the mutation's own toasts report the outcome.
            onConfirm={() =>
                mutate({ appointmentId: appointment.id, status: 'no_show' })
            }
        />
    );
}
