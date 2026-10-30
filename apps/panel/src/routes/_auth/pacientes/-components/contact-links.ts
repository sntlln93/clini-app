import type { PatientContact } from '@/types/patient';

// Contacts come normalized from the API (#365): numbers in E.164, so `tel:`
// and WhatsApp take them as they are.
export function contactHref({ type, value }: PatientContact): string {
    if (type === 'email') {
        return `mailto:${value}`;
    }

    // The chat opens empty, so nothing about the visit goes through it.
    return type === 'whatsapp'
        ? `https://wa.me/${value.replace(/\D/g, '')}`
        : `tel:${value}`;
}
