import { useEffect, useState } from 'react';

/** Trails `value` by `delayMs`, so a query keyed on it fires once typing pauses instead of on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}
