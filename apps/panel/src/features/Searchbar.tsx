import { Input } from '@/components/ui/input';
import { useEffect, useRef, useState } from 'react';

// Typing writes `q` to the URL, which re-runs the loader on every
// keystroke. The global `defaultPendingMs: 0` (`src/main.tsx`, do not
// change) would otherwise swap the whole page for `pendingComponent` on
// each character, remounting the search Input and dropping focus. Debouncing
// the navigate and raising the route's `pendingMs` keeps a normal refetch
// from ever flashing the skeleton — see ADR 0007.
export const SEARCH_DEBOUNCE_MS = 300;

type SearchbarProps = {
    value: string;
    onSearch: (value: string) => void;
    placeholder?: string;
    className?: string;
};

export function Searchbar({
    value,
    onSearch,
    placeholder,
    className,
}: SearchbarProps) {
    // Local echo of `value` for the Input's display value: it follows every
    // keystroke immediately, while `value` (the URL, the source of truth)
    // only updates once the debounce settles. Adjust-during-render sync (not
    // a `useEffect`) so an external `value` change — the clear button,
    // browser back/forward — still reaches it.
    const [searchValue, setSearchValue] = useState(value);
    const [syncedValue, setSyncedValue] = useState(value);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined,
    );

    if (value !== syncedValue) {
        setSyncedValue(value);
        setSearchValue(value);
    }

    // Clearing the pending debounce is a side effect on the ref, not state
    // derived from props, so it belongs in an effect rather than the render
    // body above — reading/writing a ref during render is disallowed. Runs
    // whenever `value` changes (typing-triggered or external), cancelling
    // any pending timer so a stale keystroke can't fire after a clear.
    useEffect(() => {
        clearTimeout(debounceRef.current);
    }, [value]);

    useEffect(() => () => clearTimeout(debounceRef.current), []);

    function handleChange(nextValue: string) {
        setSearchValue(nextValue);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onSearch(nextValue);
        }, SEARCH_DEBOUNCE_MS);
    }

    return (
        <Input
            placeholder={placeholder}
            value={searchValue}
            onChange={(event) => handleChange(event.target.value)}
            className={className}
        />
    );
}
