import { notifyError, notifySuccess } from './toast';

/** The public booking page for an organization or a professional slug, on this panel's own origin. */
export function bookingUrl(slug: string): string {
    return `${window.location.origin}/reservar/${slug}`;
}

/** Copies a booking link to share it, saying how it went. */
export async function copyBookingLink(url: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(url);
        notifySuccess('Link copiado');
    } catch (error) {
        notifyError(error, 'No se pudo copiar el link');
    }
}
