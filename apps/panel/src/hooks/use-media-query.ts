import { useCallback, useSyncExternalStore } from 'react';

/** Whether `query` matches now, following its changes (e.g. a breakpoint crossed while resizing). */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const list = window.matchMedia(query);
            list.addEventListener('change', onChange);
            return () => list.removeEventListener('change', onChange);
        },
        [query],
    );

    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(query).matches,
    );
}

/** Tailwind's `lg` breakpoint, where the panel switches to its desktop layouts. */
export const DESKTOP_QUERY = '(min-width: 64rem)';
