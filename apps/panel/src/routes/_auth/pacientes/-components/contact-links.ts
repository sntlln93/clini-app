export function mailtoHref(email: string): string {
    return `mailto:${email}`;
}

// `tel:` URIs take digits (and a leading `+`) only, without the separators people type.
export function telHref(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
