import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatPriceCents } from '@/lib/price';
import type {
    BookingConfirmation as BookingConfirmationData,
    BookingService,
} from '@/types/booking';

import { BookingCalendarLinks } from './BookingCalendarLinks';
import { BookingDetailRow } from './BookingDetailRow';
import { formatAppointmentDateTime } from './booking-format';

type BookingConfirmationProps = {
    confirmation: BookingConfirmationData;
    timezone: string;
    /** The booked service as listed by the practice, for its duration and price; absent if it can no longer be resolved. */
    service?: BookingService;
    onBookAnother: () => void;
};

/**
 * There is no path back to the submitted form, so the booking can't be
 * resubmitted; "Reservar otro turno" starts a fresh one instead. No email
 * is sent for online bookings, so the copy never claims one was.
 */
export function BookingConfirmation({
    confirmation,
    timezone,
    service,
    onBookAnother,
}: BookingConfirmationProps) {
    const price = service ? formatPriceCents(service.price_cents) : null;

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <Badge variant="secondary">Turno confirmado</Badge>
                <h1 className="text-lg tracking-tight">
                    {confirmation.organization_name}
                </h1>
            </div>

            <Separator />

            <dl className="space-y-2 text-sm">
                <BookingDetailRow
                    term="Profesional"
                    value={confirmation.professional_name ?? '—'}
                />
                <BookingDetailRow
                    term="Prestación"
                    value={confirmation.service_name ?? '—'}
                />
                <BookingDetailRow
                    term="Fecha y hora"
                    value={formatAppointmentDateTime(
                        confirmation.start_at,
                        timezone,
                    )}
                />
                {service && (
                    <BookingDetailRow
                        term="Duración"
                        value={`${service.duration_minutes} min`}
                    />
                )}
                {price && <BookingDetailRow term="Precio" value={price} />}
            </dl>

            <BookingCalendarLinks confirmation={confirmation} />

            <p className="text-sm text-muted-foreground">
                Guardá estos datos. Si necesitás cancelar o reprogramar el
                turno, comunicate con {confirmation.organization_name}.
            </p>

            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onBookAnother}
            >
                Reservar otro turno
            </Button>
        </div>
    );
}
