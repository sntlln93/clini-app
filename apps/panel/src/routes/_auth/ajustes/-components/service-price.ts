const PESOS_FORMAT = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
});

/** Prefills the peso input from the API's `price_cents`; `null` (no price) stays an empty field. */
export function centsToPesosInput(cents: number | null): string {
    return cents === null ? '' : String(cents / 100);
}

/** `null` for an empty field (no price), `undefined` when the value isn't a non-negative amount. */
export function pesosInputToCents(value: string): number | null | undefined {
    if (value.trim() === '') {
        return null;
    }

    const pesos = Number(value);
    if (!Number.isFinite(pesos) || pesos < 0) {
        return undefined;
    }

    return Math.round(pesos * 100);
}

/** e.g. 1500000 → "$ 15.000,00". */
export function formatPesos(cents: number): string {
    return PESOS_FORMAT.format(cents / 100);
}

/** Whole minutes ≥ 1, or `undefined` for an empty/invalid field. */
export function parseDurationInput(value: string): number | undefined {
    const minutes = Number(value);

    return value.trim() !== '' && Number.isInteger(minutes) && minutes >= 1
        ? minutes
        : undefined;
}
