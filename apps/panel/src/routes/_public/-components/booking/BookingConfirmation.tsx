import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { BookingConfirmation as BookingConfirmationData } from '@/types/booking';

type BookingConfirmationProps = {
    confirmation: BookingConfirmationData;
    timezone: string;
};

function formatDateTime(isoInstant: string, timeZone: string): string {
    return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone,
    }).format(new Date(isoInstant));
}

/**
 * Terminal step: the wizard has no path back from here, so the booking
 * can't be resubmitted.
 */
export function BookingConfirmation({
    confirmation,
    timezone,
}: BookingConfirmationProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <Badge variant="secondary">Turno confirmado</Badge>
                <h1 className="text-lg font-semibold">
                    {confirmation.organization_name}
                </h1>
            </div>

            <Separator />

            <dl className="space-y-2 text-sm">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <dt className="text-muted-foreground">Profesional</dt>
                    <dd className="min-w-0 text-right font-medium wrap-break-word">
                        {confirmation.professional_name ?? '—'}
                    </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <dt className="text-muted-foreground">Prestación</dt>
                    <dd className="min-w-0 text-right font-medium wrap-break-word">
                        {confirmation.service_name ?? '—'}
                    </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <dt className="text-muted-foreground">Fecha y hora</dt>
                    <dd className="min-w-0 text-right font-medium wrap-break-word">
                        {formatDateTime(confirmation.start_at, timezone)}
                    </dd>
                </div>
            </dl>
        </div>
    );
}
