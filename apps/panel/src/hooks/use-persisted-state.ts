import { useCallback, useMemo, useSyncExternalStore } from 'react';

const IN_TAB_EVENT = 'clini:persisted-state';

type Updater<T> = T | ((prev: T) => T);

function read<T>(key: string, initial: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
        return initial;
    }
}

function subscribe(callback: () => void) {
    window.addEventListener('storage', callback);
    window.addEventListener(IN_TAB_EVENT, callback);
    return () => {
        window.removeEventListener('storage', callback);
        window.removeEventListener(IN_TAB_EVENT, callback);
    };
}

/**
 * Persists a JSON-serializable value in `localStorage`, kept in sync via
 * both the native `storage` event and an in-tab custom event — the native
 * event never fires in the tab that performed the write.
 */
export function usePersistedState<T>(
    key: string,
    initial: T,
): [T, (next: Updater<T>) => void] {
    const raw = useSyncExternalStore(
        subscribe,
        () => localStorage.getItem(key),
        () => null,
    );

    const value = useMemo<T>(() => {
        if (raw === null) return initial;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return initial;
        }
    }, [raw, initial]);

    const setValue = useCallback(
        (next: Updater<T>) => {
            const resolved =
                typeof next === 'function'
                    ? (next as (prev: T) => T)(read(key, initial))
                    : next;
            try {
                localStorage.setItem(key, JSON.stringify(resolved));
            } catch {
                // ignore write failures (e.g. private mode quota)
            }
            window.dispatchEvent(new Event(IN_TAB_EVENT));
        },
        [key, initial],
    );

    return [value, setValue];
}
