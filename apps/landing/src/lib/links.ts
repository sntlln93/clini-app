import type { Billing } from '@/lib/pricing';
import type { PlanId } from '@/routes/-components/plans';

// Baked at build time (Dockerfile build arg), same as VITE_API_URL in the
// panel.
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

// The landing's own contact form (#248), with the plan the visitor came from
// preselected.
export function contactUrl(plan?: PlanId): string {
    return plan ? `/contacto?plan=${plan}` : '/contacto';
}
