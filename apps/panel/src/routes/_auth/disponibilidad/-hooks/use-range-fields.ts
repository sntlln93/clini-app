import { useState } from 'react';
import { toClock, toMinutes, type Range } from '../-components/week-draft';

export type RangeValues = { start: string; end: string };

const CLOCK = /^\d{2}:\d{2}$/;

function valuesOf(range: Range): RangeValues {
    return { start: toClock(range.start), end: toClock(range.end) };
}

function errorOf(values: RangeValues): string | null {
    if (!CLOCK.test(values.start) || !CLOCK.test(values.end)) {
        return 'Completá la hora de inicio y la de fin.';
    }

    return toMinutes(values.end) > toMinutes(values.start)
        ? null
        : 'La hora de fin tiene que ser posterior a la de inicio.';
}

/** The range the inputs hold, or null while they don't make a valid one. */
export function rangeOf(values: RangeValues): Range | null {
    return errorOf(values) === null
        ? { start: toMinutes(values.start), end: toMinutes(values.end) }
        : null;
}

/**
 * The Desde/Hasta inputs of one range, edited locally until they make a valid
 * range; when the range itself changes (a drag, a merge), they follow it.
 */
export function useRangeFields(range: Range) {
    const [values, setValues] = useState(() => valuesOf(range));
    const [source, setSource] = useState(range);

    // Adjusts state during render instead of in an effect (react-hooks/set-state-in-effect).
    if (source.start !== range.start || source.end !== range.end) {
        setSource(range);
        setValues(valuesOf(range));
    }

    const error = errorOf(values);
    const parsed = rangeOf(values);

    return {
        values,
        error,
        parsed,
        changed:
            parsed !== null &&
            (parsed.start !== range.start || parsed.end !== range.end),
        setStart: (start: string) =>
            setValues((current) => ({ ...current, start })),
        setEnd: (end: string) => setValues((current) => ({ ...current, end })),
    };
}
