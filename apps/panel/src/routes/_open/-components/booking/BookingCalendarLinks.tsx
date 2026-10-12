import { useId, useState } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { DateTime } from '@/lib/datetime';
import type { BookingConfirmation } from '@/types/booking';
import { CalendarPlusIcon, DownloadIcon } from 'lucide-react';

import {
    bookingCalendarEvent,
    googleCalendarUrl,
    icsDataUrl,
    icsFile,
} from './calendar-event';

type BookingCalendarLinksProps = {
    confirmation: BookingConfirmation;
    slug: string;
};

/**
 * Both shown at once rather than behind a menu: one tap each, and neither
 * depends on the patient having left an email (#295). Plain links styled as
 * buttons, not `Button` with `render`, which would announce them as buttons.
 */
export function BookingCalendarLinks({
    confirmation,
    slug,
}: BookingCalendarLinksProps) {
    // Fixed once per confirmation, so a re-render doesn't change the file.
    const [stampedAt] = useState(() => DateTime.now());
    const event = bookingCalendarEvent(confirmation, slug);
    const labelId = useId();

    return (
        <div role="group" aria-labelledby={labelId} className="space-y-2">
            <p id={labelId} className="text-sm font-medium">
                Agregar a mi calendario
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
                <a
                    href={googleCalendarUrl(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: 'outline' })}
                >
                    <CalendarPlusIcon data-icon="inline-start" />
                    Google Calendar
                    <span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
                <a
                    href={icsDataUrl(icsFile(event, stampedAt))}
                    download="turno.ics"
                    className={buttonVariants({ variant: 'outline' })}
                >
                    <DownloadIcon data-icon="inline-start" />
                    Descargar .ics
                </a>
            </div>
            <p className="text-xs text-muted-foreground">
                El archivo .ics sirve para Apple Calendar, Outlook y otros
                calendarios.
            </p>
        </div>
    );
}
