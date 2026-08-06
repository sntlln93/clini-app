import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { useState } from 'react';
import { useUpdateAppointmentStatus } from '../-hooks/use-appointments';
import { CancelAppointmentDialog } from './CancelAppointmentDialog';
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

/**
 * Solid per-status surface used only by the `day` variant — the `default`
 * variant (week view) keeps its single translucent `bg-primary/10` look
 * unchanged. Built exclusively from semantic tokens already used elsewhere
 * in this file (see `badgeVariants` in `components/ui/badge.tsx`).
 */
const STATUS_DAY_STYLES: Record<AppointmentStatus, string> = {
    scheduled: 'border-border bg-background text-foreground',
    confirmed: 'border-transparent bg-secondary text-secondary-foreground',
    arrived: 'border-transparent bg-accent text-accent-foreground',
    completed: 'border-transparent bg-primary text-primary-foreground',
    no_show: 'border-transparent bg-destructive/15 text-destructive',
    cancelled: 'border-transparent bg-destructive/15 text-destructive',
    rescheduled: 'border-border bg-background text-foreground',
};

type AppointmentCardVariant = 'default' | 'day';

function formatTime(iso: string, variant: AppointmentCardVariant): string {
    const date = new Date(iso);

    if (variant === 'day') {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    return date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

type AppointmentCardProps = {
    appointment: Appointment;
    canUpdate: boolean;
    /** @default 'default' — reproduces the original render used by the week view. */
    variant?: AppointmentCardVariant;
    /** Day view only: hides the service line when the block is too short for three lines. */
    compact?: boolean;
};

export function AppointmentCard({
    appointment,
    canUpdate,
    variant = 'default',
    compact = false,
}: AppointmentCardProps) {
    const [showReschedule, setShowReschedule] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const { mutate } = useUpdateAppointmentStatus();
    const nextStatuses = ALLOWED_TRANSITIONS[appointment.status];
    const canCancel = CANCELLABLE_STATUSES.includes(appointment.status);
    const canReschedule = RESCHEDULABLE_STATUSES.includes(appointment.status);
    const timeLabel = `${formatTime(appointment.start_at, variant)}–${formatTime(appointment.end_at, variant)}`;
    const patientLabel =
        appointment.patient_name ?? `Paciente #${appointment.patient_id}`;
    const serviceLabel =
        appointment.service_name ?? `Servicio #${appointment.service_id}`;

    const content =
        variant === 'day' ? (
            <div
                className={cn(
                    'flex h-full flex-col gap-0.5 overflow-hidden rounded-md border p-1.5 text-left text-xs',
                    STATUS_DAY_STYLES[appointment.status],
                )}
            >
                <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold whitespace-nowrap">
                        {timeLabel}
                    </span>
                    <Badge variant={STATUS_VARIANTS[appointment.status]}>
                        {STATUS_LABELS[appointment.status]}
                    </Badge>
                </div>
                <span className="truncate font-medium">{patientLabel}</span>
                {!compact && (
                    <span className="truncate text-[0.6875rem] opacity-80">
                        {serviceLabel}
                    </span>
                )}
            </div>
        ) : (
            <div className="flex h-full flex-col gap-0.5 overflow-hidden rounded-md border border-primary/30 bg-primary/10 p-1.5 text-left text-xs">
                <div className="flex items-center justify-between gap-1">
                    <span className="font-medium">{timeLabel}</span>
                    <Badge variant={STATUS_VARIANTS[appointment.status]}>
                        {STATUS_LABELS[appointment.status]}
                    </Badge>
                </div>
                <span className="truncate font-medium">{patientLabel}</span>
                <span className="truncate text-muted-foreground">
                    {serviceLabel}
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
                            onClick={() => setShowCancel(true)}
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

            <CancelAppointmentDialog
                open={showCancel}
                onOpenChange={setShowCancel}
                appointment={appointment}
            />
        </>
    );
}
