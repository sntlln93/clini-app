import type { Billing } from '@/lib/pricing';

// Baked at build time (Dockerfile build arg), same as VITE_API_URL in the
// panel: the landing only links out to the panel, it never calls the API.
const PANEL_URL = (import.meta.env.VITE_PANEL_URL ?? '').replace(/\/+$/, '');

export const loginUrl = `${PANEL_URL}/login`;
export const registerUrl = `${PANEL_URL}/registro`;
// Preselects Consultorio on the panel's registration, which then sends the
// new account to the Mercado Pago checkout (#286) — yearly when the visitor
// chose to pay the year (#240); monthly is the panel's default.
export function consultorioRegisterUrl(billing: Billing): string {
    const url = `${registerUrl}?plan=consultorio`;

    return billing === 'annual' ? `${url}&pago=anual` : url;
}

// Optional: where a prospective "Centro" customer gets in touch (a mailto:,
// a WhatsApp link, a scheduling page). Until there is one, the page offers
// the free signup instead of a contact action that leads nowhere (#248).
const CONTACT_URL = import.meta.env.VITE_CONTACT_URL?.trim() || null;

export const contactUrl: string | null = CONTACT_URL;
