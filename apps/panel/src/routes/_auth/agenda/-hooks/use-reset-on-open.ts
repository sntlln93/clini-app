import { useState } from 'react';

/**
 * Runs `reset` during render (not an Effect) on every open and whenever `key`
 * changes while open; closing forgets the key, so reopening with the same
 * one resets too.
 */
export function useResetOnOpen(open: boolean, key: string, reset: () => void) {
    const [appliedKey, setAppliedKey] = useState<string | null>(null);
    const openKey = open ? key : null;

    if (openKey !== appliedKey) {
        setAppliedKey(openKey);
        if (open) {
            reset();
        }
    }
}
