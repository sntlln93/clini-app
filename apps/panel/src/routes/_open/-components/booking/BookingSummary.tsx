import type {
    AvailableSlot,
    BookingProfessional,
    BookingService,
} from '@/types/booking';
import {
    formatSlotDateTime,
    professionalLabel,
    serviceLabel,
} from './booking-format';

type BookingStepHeaderProps = {
    organizationName: string;
    step: 1 | 2 | 3;
};

/** Persistent context above every step but the confirmation: where the patient is booking and how far along. */
export function BookingStepHeader({
    organizationName,
    step,
}: BookingStepHeaderProps) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <p className="min-w-0 font-medium wrap-break-word">
                {organizationName}
            </p>
            <p className="text-muted-foreground">Paso {step} de 3</p>
        </div>
    );
}

type BookingSummaryProps = {
    professional: BookingProfessional;
    service: BookingService;
    timezone: string;
    /** Only on the patient-data step, once a time is chosen. */
    slot?: AvailableSlot;
};

/** What the patient has chosen so far, so they never confirm blind. */
export function BookingSummary({
    professional,
    service,
    timezone,
    slot,
}: BookingSummaryProps) {
    return (
        <div className="space-y-0.5 rounded-md bg-muted p-3 text-sm">
            <p className="font-medium wrap-break-word">
                {`${professionalLabel(professional)} · ${serviceLabel(service)} (${service.duration_minutes} min)`}
            </p>
            {slot && (
                <p className="text-muted-foreground tabular-nums first-letter:uppercase">
                    {formatSlotDateTime(slot.start_at, timezone)}
                </p>
            )}
        </div>
    );
}
