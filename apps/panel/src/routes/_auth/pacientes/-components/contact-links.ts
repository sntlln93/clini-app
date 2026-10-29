export function mailtoHref(email: string): string {
    return `mailto:${email}`;
}

// `tel:` URIs take digits (and a leading `+`) only, without the separators people type.
export function telHref(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

// WhatsApp needs the full international number, and the phone is free text:
// only a number written with its `+` country code is sure to reach the right
// person. The chat opens empty, so nothing about the visit goes through it.
export function whatsappHref(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');

    return phone.trim().startsWith('+') && digits.length >= 8
        ? `https://wa.me/${digits}`
        : null;
}
