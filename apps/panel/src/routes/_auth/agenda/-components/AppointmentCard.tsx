import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { useState } from 'react';
import {
    useCancelAppointment,
    useUpdateAppointmentStatus,
} from '../-hooks/use-appointments';
import { RescheduleAppointmentDialog } from './RescheduleAppointmentDialog';

/**
 * Mirrors `AppointmentStatus::allowedTransitions()` in the backend enum
 * (`app/Enums/AppointmentStatus.php`) — keep both in sync.
 */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
    scheduled: ['confirmed', 'no_show'],
    confirmed: ['arrived', 'no_show'],
    arrived: ['completed'],
    completed: [],
    no_show: [],
    cancelled: [],
    rescheduled: [],
};

/**
 * Mirrors `CancelAppointmentAction::CANCELLABLE_STATUSES` in the backend
 * (`app/Actions/Appointments/CancelAppointmentAction.php`) — keep in sync.
 */
const CANCELLABLE_STATUSES: AppointmentStatus[] = [
    'scheduled',
    'confirmed',
    'arrived',
];

/**
 * Mirrors `RescheduleAppointmentAction::RESCHEDULABLE_STATUSES` in the
 * backend (`app/Actions/Appointments/RescheduleAppointmentAction.php`) —
 * keep in sync.
 */
const RESCHEDULABLE_STATUSES: AppointmentStatus[] = ['scheduled', 'confirmed'];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    arrived: 'Llegó',
    completed: 'Completado',
    no_show: 'Ausente',
    cancelled: 'Cancelado',
    rescheduled: 'Reprogramado',
};

const STATUS_VARIANTS: Record<
    AppointmentStatus,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    scheduled: 'outline',
    confirmed: 'secondary',
    arrived: 'secondary',
    completed: 'default',
    no_show: 'destructive',
    cancelled: 'destructive',
    rescheduled: 'outline',
};

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

type AppointmentCardProps = {
    appointment: Appointment;
    canUpdate: boolean;
};

export function AppointmentCard({
    appointment,
    canUpdate,
}: AppointmentCardProps) {
    const [showReschedule, setShowReschedule] = useState(false);
    const { mutate } = useUpdateAppointmentStatus();
    const { mutate: cancelAppointment } = useCancelAppointment();
    const nextStatuses = ALLOWED_TRANSITIONS[appointment.status];
    const canCancel = CANCELLABLE_STATUSES.includes(appointment.status);
    const canReschedule = RESCHEDULABLE_STATUSES.includes(appointment.status);

    const content = (
        <div className="flex h-full flex-col gap-0.5 overflow-hidden rounded-md border border-primary/30 bg-primary/10 p-1.5 text-left text-xs">
            <div className="flex items-center justify-between gap-1">
                <span className="font-medium">
                    {formatTime(appointment.start_at)}–
                    {formatTime(appointment.end_at)}
                </span>
                <Badge variant={STATUS_VARIANTS[appointment.status]}>
                    {STATUS_LABELS[appointment.status]}
                </Badge>
            </div>
            <span className="truncate font-medium">
                {appointment.patient_name ??
                    `Paciente #${appointment.patient_id}`}
            </span>
            <span className="truncate text-muted-foreground">
                {appointment.service_name ??
                    `Servicio #${appointment.service_id}`}
            </span>
        </div>
    );

    const hasActions =
        canUpdate && (nextStatuses.length > 0 || canCancel || canReschedule);

    if (!hasActions) {
        return content;
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger className="block h-full w-full text-left">
                    {content}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {nextStatuses.map((status) => (
                        <DropdownMenuItem
                            key={status}
                            onClick={() =>
                                mutate({
                                    appointmentId: appointment.id,
                                    status,
                                })
                            }
                        >
                            {STATUS_LABELS[status]}
                        </DropdownMenuItem>
                    ))}
                    {(canCancel || canReschedule) &&
                        nextStatuses.length > 0 && <DropdownMenuSeparator />}
                    {canReschedule && (
                        <DropdownMenuItem
                            onClick={() => setShowReschedule(true)}
                        >
                            Reprogramar
                        </DropdownMenuItem>
                    )}
                    {canCancel && (
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                                cancelAppointment({
                                    appointmentId: appointment.id,
                                    cancellationReason: null,
                                })
                            }
                        >
                            Cancelar
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <RescheduleAppointmentDialog
                open={showReschedule}
                onOpenChange={setShowReschedule}
                appointment={appointment}
            />
        </>
    );
}
