/** The public booking page for an organization or a professional slug, on this panel's own origin. */
export function bookingUrl(slug: string): string {
    return `${window.location.origin}/reservar/${slug}`;
}
