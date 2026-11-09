const ARS_FORMAT = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
});

/**
 * Cents as an exact decimal string, e.g. 1850050 → "18500.50": the pesos and
 * the cents apart, never a fractional number, which past 2^46 pesos no longer
 * tells one cent from the next. Exact for any safe integer.
 */
export function centsToDecimal(cents: number): string {
    const sign = cents < 0 ? '-' : '';
    const absolute = Math.abs(cents);
    const fraction = absolute % 100;

    return `${sign}${(absolute - fraction) / 100}.${String(fraction).padStart(2, '0')}`;
}

/** e.g. 1500000 → "$ 15.000,00"; `null` (no price set) stays `null` so callers can omit it. ARS only, read-only. */
export function formatPriceCents(cents: number | null): string | null {
    return cents === null
        ? null
        : ARS_FORMAT.format(centsToDecimal(cents) as Intl.StringNumericLiteral);
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
