import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

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
    const inputRef = useRef<HTMLInputElement>(null);
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

    /** Skips the debounce; an unchanged value doesn't trigger a pointless navigation. */
    function applyNow(nextValue: string) {
        clearTimeout(debounceRef.current);
        setSearchValue(nextValue);
        if (nextValue !== value) {
            onSearch(nextValue);
        }
    }

    function clear() {
        applyNow('');
        inputRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyNow(searchValue);
        } else if (event.key === 'Escape' && searchValue !== '') {
            event.preventDefault();
            clear();
        }
    }

    // Not `type="search"`: WebKit would draw its own clear button next to this one.
    return (
        <div className={cn('relative w-full', className)}>
            <Label htmlFor={inputId} className="sr-only">
                {label ?? placeholder ?? 'Buscar'}
            </Label>
            <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
                ref={inputRef}
                id={inputId}
                placeholder={placeholder}
                value={searchValue}
                onChange={(event) => handleChange(event.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                    'pl-8',
                    searchValue !== '' && 'pr-8 pointer-coarse:pr-12',
                )}
            />
            {searchValue !== '' && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Limpiar búsqueda"
                    onClick={clear}
                    className="absolute top-1/2 right-0.5 -translate-y-1/2 pointer-coarse:right-0"
                >
                    <X />
                </Button>
            )}
        </div>
    );
}
