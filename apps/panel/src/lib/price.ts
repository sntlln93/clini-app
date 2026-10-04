const ARS_FORMAT = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
});

/** e.g. 1500000 → "$ 15.000,00"; `null` (no price set) stays `null` so callers can omit it. ARS only, read-only. */
export function formatPriceCents(cents: number | null): string | null {
    return cents === null ? null : ARS_FORMAT.format(cents / 100);
}
