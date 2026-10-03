import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import {
    STATUS_DAY_STYLES,
    STATUS_LABELS,
    STATUS_VARIANTS,
} from './appointment-status';

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
};

// The visual block of an appointment, shared by the week (`default`) and day views.
export function AppointmentCardContent({
    appointment,
    variant,
    compact,
}: AppointmentCardContentProps) {
    const timeLabel = `${formatTime(appointment.start_at, variant)}–${formatTime(appointment.end_at, variant)}`;
    const patientLabel =
        appointment.patient_name ?? `Paciente #${appointment.patient_id}`;
    const serviceLabel =
        appointment.service_name ?? `Servicio #${appointment.service_id}`;

    return variant === 'day' ? (
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
}
