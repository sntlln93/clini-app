const PESOS_FORMAT = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
});

/** Prefills the peso input from the API's `price_cents` in es-AR notation (comma decimal); `null` (no price) stays an empty field. */
export function centsToPesosInput(cents: number | null): string {
    if (cents === null) {
        return '';
    }

    return cents % 100 === 0
        ? String(cents / 100)
        : (cents / 100).toFixed(2).replace('.', ',');
}

// es-AR amounts: dots group thousands in threes ("15.000"), a comma starts the
// cents ("15.000,50"). A lone dot followed by 1-2 digits ("50.5") can only be a
// decimal point, so it is accepted too; anything else is ambiguous and rejected.
const GROUPED_PESOS = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/;
const PLAIN_PESOS = /^\d+(?:,\d{1,2})?$/;
const DOT_DECIMAL_PESOS = /^\d+\.\d{1,2}$/;

/** `null` for an empty field (no price), `undefined` when the value isn't a non-negative es-AR amount. */
export function pesosInputToCents(value: string): number | null | undefined {
    const trimmed = value.trim();
    if (trimmed === '') {
        return null;
    }

    let normalized: string;
    if (GROUPED_PESOS.test(trimmed)) {
        normalized = trimmed.replaceAll('.', '').replace(',', '.');
    } else if (PLAIN_PESOS.test(trimmed)) {
        normalized = trimmed.replace(',', '.');
    } else if (DOT_DECIMAL_PESOS.test(trimmed)) {
        normalized = trimmed;
    } else {
        return undefined;
    }

    return Math.round(Number(normalized) * 100);
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
