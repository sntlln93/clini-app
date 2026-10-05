// Baked at build time (Dockerfile build arg), same as VITE_API_URL in the
// panel: the landing only links out to the panel, it never calls the API.
const PANEL_URL = (import.meta.env.VITE_PANEL_URL ?? '').replace(/\/+$/, '');

export const loginUrl = `${PANEL_URL}/login`;
export const registerUrl = `${PANEL_URL}/registro`;

// Optional: where a prospective "Centro" customer gets in touch (a mailto:,
// a WhatsApp link, a scheduling page). Until there is one, the page offers
// the free signup instead of a contact action that leads nowhere (#248).
const CONTACT_URL = import.meta.env.VITE_CONTACT_URL?.trim() || null;

export const contactUrl: string | null = CONTACT_URL;
