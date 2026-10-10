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

    const status = (
        <span className="flex min-w-0 items-center gap-1">
            <AppointmentStatusChip status={appointment.status} surface="card" />
            {appointment.origin === 'online' && <OnlineOriginMark />}
        </span>
    );
    const time = (
        <span className="font-medium whitespace-nowrap tabular-nums">
            {timeLabel}
        </span>
    );
    const patient = (
        <span className={cn('truncate font-medium', struck && 'line-through')}>
            {patientLabel}
        </span>
    );
    const service = (
        <span className="truncate text-muted-foreground">{serviceLabel}</span>
    );
    const block = cn(
        'flex h-full flex-col gap-0.5 overflow-hidden border-l-[3px] text-left text-xs leading-tight text-foreground',
        STATUS_TONES[appointment.status].block,
    );

    // Day view: the landing's block — patient, service, then status (with the time) at the bottom.
    if (variant === 'day') {
        return (
            <div
                data-status={appointment.status}
                className={cn(block, 'rounded-xl px-2.5 py-1.5')}
            >
                {patient}
                {!compact && service}
                <div className="mt-auto flex items-center justify-between gap-1 pt-0.5">
                    {status}
                    <span className="text-[0.65rem] text-muted-foreground">
                        {time}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div
            data-status={appointment.status}
            className={cn(block, 'rounded-lg px-2 py-1.5')}
        >
            <div className="flex items-center justify-between gap-1">
                {time}
                {status}
            </div>
            {patient}
            {service}
            {professionalLabel && (
                <span className="truncate text-muted-foreground">
                    {professionalLabel}
                </span>
            )}
        </div>
    );
}
