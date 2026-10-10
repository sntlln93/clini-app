import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatPriceCents } from '@/lib/price';
import type {
    BookingConfirmation as BookingConfirmationData,
    BookingService,
} from '@/types/booking';

type BookingConfirmationProps = {
    confirmation: BookingConfirmationData;
    timezone: string;
    /** The booked service as listed by the practice, for its duration and price; absent if it can no longer be resolved. */
    service?: BookingService;
    onBookAnother: () => void;
};

function formatDateTime(isoInstant: string, timeZone: string): string {
    return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone,
    }).format(new Date(isoInstant));
}

function DetailRow({ term, value }: { term: string; value: string }) {
    return (
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="min-w-0 text-right font-medium wrap-break-word tabular-nums">
                {value}
            </dd>
        </div>
    );
}

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
                <DetailRow
                    term="Profesional"
                    value={confirmation.professional_name ?? '—'}
                />
                <DetailRow
                    term="Prestación"
                    value={confirmation.service_name ?? '—'}
                />
                <DetailRow
                    term="Fecha y hora"
                    value={formatDateTime(confirmation.start_at, timezone)}
                />
                {service && (
                    <DetailRow
                        term="Duración"
                        value={`${service.duration_minutes} min`}
                    />
                )}
                {price && <DetailRow term="Precio" value={price} />}
            </dl>

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
