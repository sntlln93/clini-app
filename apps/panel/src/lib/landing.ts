/**
 * The public site's origin, optional: a deployment may run without the landing,
 * so without it «Hecho con Clini» renders as plain text.
 */
export const LANDING_URL: string | null =
    (import.meta.env.VITE_LANDING_URL as string | undefined) || null;
