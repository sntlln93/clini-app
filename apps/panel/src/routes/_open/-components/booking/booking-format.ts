import { fromInstant } from '@/lib/datetime';
import { formatPriceCents } from '@/lib/price';
import type { BookingProfessional, BookingService } from '@/types/booking';

export function professionalLabel(professional: BookingProfessional): string {
    return professional.name ?? `Profesional #${professional.membership_id}`;
}

export function serviceLabel(service: BookingService): string {
    return service.name ?? `Prestación #${service.id}`;
}

/** e.g. "Primera vez · 45 min · $ 15.000,00"; the price is left out when the service has none. */
export function serviceOptionLabel(service: BookingService): string {
    const price = formatPriceCents(service.price_cents);

    return [serviceLabel(service), `${service.duration_minutes} min`, price]
        .filter(Boolean)
        .join(' · ');
}

// The booking page is the practice's own, but outside `_auth`: its zone travels explicitly instead of as Luxon's default.
export function formatSlotTime(isoInstant: string, timeZone: string): string {
    return fromInstant(isoInstant)
        .setZone(timeZone)
        .toLocaleString({ hour: '2-digit', minute: '2-digit' });
}

/** e.g. "lunes, 3 de agosto, 10:00 GMT-3": the zone is spelled out since the practice's may differ from the patient's. */
export function formatSlotDateTime(
    isoInstant: string,
    timeZone: string,
): string {
    return fromInstant(isoInstant).setZone(timeZone).toLocaleString({
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
    });
}

/** e.g. "lunes, 3 de agosto de 2026, 10:00": a booked appointment, in the practice's zone. */
export function formatAppointmentDateTime(
    isoInstant: string,
    timeZone: string,
): string {
    return fromInstant(isoInstant)
        .setZone(timeZone)
        .toLocaleString({ dateStyle: 'full', timeStyle: 'short' });
}
