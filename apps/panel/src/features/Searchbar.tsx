import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useId, useRef, useState } from 'react';

// Debouncing the navigate and raising the route's `pendingMs` keep the global `defaultPendingMs: 0` (`src/main.tsx`)
// from swapping the page for `pendingComponent` on every keystroke, remounting the Input and dropping focus — see ADR 0007.
export const SEARCH_DEBOUNCE_MS = 300;

type SearchbarProps = {
    value: string;
    onSearch: (value: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
};

export function Searchbar({
    value,
    onSearch,
    placeholder,
    className,
    label,
}: SearchbarProps) {
    const inputId = useId();
    // Display echo of `value` (URL is the source of truth; catches up once the debounce settles), synced during render — not a `useEffect` — so an external `value` change still reaches it.
    const [searchValue, setSearchValue] = useState(value);
    const [syncedValue, setSyncedValue] = useState(value);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined,
    );

    if (value !== syncedValue) {
        setSyncedValue(value);
        setSearchValue(value);
    }

    // A ref may not be read/written during render, so this cancels the pending timer here instead, keeping a stale keystroke from firing after an external change/clear.
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
        <>
            <Label htmlFor={inputId} className="sr-only">
                {label ?? placeholder ?? 'Buscar'}
            </Label>
            <Input
                id={inputId}
                placeholder={placeholder}
                value={searchValue}
                onChange={(event) => handleChange(event.target.value)}
                className={className}
            />
        </>
    );
}
