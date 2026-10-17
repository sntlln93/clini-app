import { useSyncExternalStore } from 'react';

function subscribe() {
    return () => {};
}

/** False in the server HTML and until React hydrates it, true afterwards. */
export function useHydrated(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );
}
