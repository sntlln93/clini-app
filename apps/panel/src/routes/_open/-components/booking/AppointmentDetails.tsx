import { Separator } from '@/components/ui/separator';
import type { AppointmentDetailsResponse } from '@/types/booking';

import { AccessCode } from './AccessCode';
import { BookingCalendarLinks } from './BookingCalendarLinks';
import { BookingDetailRow } from './BookingDetailRow';
import { formatAppointmentDateTime } from './booking-format';

/**
 * What the reminder mail leaves out (#320): the professional and the service
 * are shown here, behind the link, and never travel through the mail
 * provider. The calendar links still carry only the practice (ADR 0018).
 */
export function AppointmentDetails({
    organization,
    appointment,
    access_code,
}: AppointmentDetailsResponse) {
    return (
        <div className="space-y-4">
            <h1 className="text-lg tracking-tight">
                Tu turno en {organization.name}
            </h1>

            <Separator />

            <dl className="space-y-2 text-sm">
                <BookingDetailRow
                    term="Fecha y hora"
                    value={formatAppointmentDateTime(
                        appointment.start_at,
                        organization.timezone,
                    )}
                />
                <BookingDetailRow
                    term="Profesional"
                    value={appointment.professional_name ?? '—'}
                />
                <BookingDetailRow
                    term="Prestación"
                    value={appointment.service_name ?? '—'}
                />
                {appointment.organization_address && (
                    <BookingDetailRow
                        term="Dirección"
                        value={appointment.organization_address}
                    />
                )}
            </dl>

            <BookingCalendarLinks confirmation={appointment} />

            {access_code && <AccessCode code={access_code} />}

            <p className="text-sm text-muted-foreground">
                Si necesitás cancelar o reprogramar el turno, comunicate con{' '}
                {organization.name}.
            </p>
        </div>
    );
}
