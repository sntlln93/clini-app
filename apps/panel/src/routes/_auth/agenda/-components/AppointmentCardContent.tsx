import { AppointmentStatusChip } from '@/features/appointment-status/AppointmentStatusChip';
import { OnlineOriginMark } from '@/features/appointment-status/OnlineOriginMark';
import { STATUS_TONES, STRUCK_STATUSES } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';

export type AppointmentCardVariant = 'default' | 'day';

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

type AppointmentCardContentProps = {
    appointment: Appointment;
    variant: AppointmentCardVariant;
    compact: boolean;
    /** Rendered by the `default` variant only; the day view already has one column per professional. */
    professionalLabel?: string;
};

// The visual block of an appointment, shared by the week (`default`) and day
// views: the status' soft fill with its strong color as a left bar (#235).
export function AppointmentCardContent({
    appointment,
    variant,
    compact,
    professionalLabel,
}: AppointmentCardContentProps) {
    const timeLabel = `${formatTime(appointment.start_at, variant)}–${formatTime(appointment.end_at, variant)}`;
    const patientLabel =
        appointment.patient_name ?? `Paciente #${appointment.patient_id}`;
    const serviceLabel =
        appointment.service_name ?? `Servicio #${appointment.service_id}`;
    const struck = STRUCK_STATUSES.includes(appointment.status);

    return (
        <div
            data-status={appointment.status}
            className={cn(
                'flex h-full flex-col gap-0.5 overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-left text-xs leading-tight text-foreground',
                STATUS_TONES[appointment.status].block,
            )}
        >
            <div className="flex items-center justify-between gap-1">
                <span className="font-medium whitespace-nowrap tabular-nums">
                    {timeLabel}
                </span>
                <span className="flex items-center gap-1">
                    {appointment.origin === 'online' && <OnlineOriginMark />}
                    <AppointmentStatusChip
                        status={appointment.status}
                        surface="card"
                    />
                </span>
            </div>
            <span
                className={cn('truncate font-medium', struck && 'line-through')}
            >
                {patientLabel}
            </span>
            {(variant === 'default' || !compact) && (
                <span className="truncate text-muted-foreground">
                    {serviceLabel}
                </span>
            )}
            {variant === 'default' && professionalLabel && (
                <span className="truncate text-muted-foreground">
                    {professionalLabel}
                </span>
            )}
        </div>
    );
}
