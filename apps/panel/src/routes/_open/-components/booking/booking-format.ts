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

export function formatSlotTime(isoInstant: string, timeZone: string): string {
    return new Intl.DateTimeFormat('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
    }).format(new Date(isoInstant));
}

/** e.g. "lunes, 3 de agosto, 10:00 GMT-3": the zone is spelled out since the practice's may differ from the patient's. */
export function formatSlotDateTime(
    isoInstant: string,
    timeZone: string,
): string {
    return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
        timeZoneName: 'short',
    }).format(new Date(isoInstant));
}
