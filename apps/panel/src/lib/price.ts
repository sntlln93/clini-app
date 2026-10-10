const ARS_FORMAT = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
});

/** e.g. 1500000 → "$ 15.000,00"; `null` (no price set) stays `null` so callers can omit it. ARS only, read-only. */
export function formatPriceCents(cents: number | null): string | null {
    return cents === null ? null : ARS_FORMAT.format(cents / 100);
}

const WHOLE_PESOS_FORMAT = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
});

/** Whole pesos, as the plan prices come: e.g. 15000 → "$ 15.000". */
export function formatPesos(amount: number): string {
    return WHOLE_PESOS_FORMAT.format(amount);
}
