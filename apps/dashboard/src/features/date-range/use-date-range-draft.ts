import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { useEffect, useRef, useState } from 'react';

export type DateRange = { from?: string; to?: string };

type DateRangeDraftOptions = {
    /** The committed range (URL value, or a resolved default). */
    from: string | undefined;
    to: string | undefined;
    /** `null` = valid; anything else is shown and the draft is held back. */
    validate: (range: DateRange) => string | null;
    onCommit: (range: DateRange) => void;
};

/**
 * Local draft of a date range: every edit shows at once, only a valid draft is
 * committed, and the commit is debounced. A native date input fires `change`
 * as soon as one segment forms a valid date, so committing right away would
 * navigate mid-typing and (with `defaultPendingMs: 0`) swap the page for its
 * skeleton, remounting the input. The route pairs this with
 * `pendingMs: SEARCH_DEBOUNCE_MS`, like the Searchbar routes.
 *
 * The error is derived from the draft, and a change of the committed range
 * (another filter, "Limpiar filtros") resets the draft, so no stale error
 * outlives the values it was about.
 */
export function useDateRangeDraft({
    from,
    to,
    validate,
    onCommit,
}: DateRangeDraftOptions) {
    const [draft, setDraft] = useState<DateRange>({ from, to });
    const [synced, setSynced] = useState<DateRange>({ from, to });
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined,
    );

    // "Adjust state during render" (not an effect): a committed change resets the draft.
    if (synced.from !== from || synced.to !== to) {
        setSynced({ from, to });
        setDraft({ from, to });
    }

    // A ref may not be touched during render, so a pending commit is cancelled here once the committed range changes.
    useEffect(() => {
        clearTimeout(debounceRef.current);
    }, [from, to]);

    useEffect(() => () => clearTimeout(debounceRef.current), []);

    function change(range: DateRange) {
        const next = {
            from: range.from || undefined,
            to: range.to || undefined,
        };
        setDraft(next);
        clearTimeout(debounceRef.current);

        if (validate(next) !== null || (next.from === from && next.to === to)) {
            return;
        }

        debounceRef.current = setTimeout(
            () => onCommit(next),
            SEARCH_DEBOUNCE_MS,
        );
    }

    return { draft, error: validate(draft), change };
}
