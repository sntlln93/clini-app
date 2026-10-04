import { addDays, toDateInputValue } from './agenda-dates';
import type { AgendaViewMode } from './AgendaToolbar';

export type AgendaSearchPatch = {
    date?: string;
    view?: AgendaViewMode;
    professionals?: number[];
    showCancelled?: boolean;
};

type AgendaNavigationOptions = {
    date: Date;
    view: AgendaViewMode;
    professionalsCount: number;
    /** Merges the patch into the current search params; a key set to `undefined` drops it from the URL. */
    setSearch: (patch: AgendaSearchPatch) => void;
};

// Toolbar/filter handlers for the agenda page; every one only rewrites the URL, which stays the single source of truth.
export function agendaNavigation({
    date,
    view,
    professionalsCount,
    setSearch,
}: AgendaNavigationOptions) {
    const step = view === 'day' ? 1 : 7;
    const updateDate = (next: Date) =>
        setSearch({ date: toDateInputValue(next) });

    return {
        updateDate,
        onPrev: () => updateDate(addDays(date, -step)),
        onNext: () => updateDate(addDays(date, step)),
        onToday: () => updateDate(new Date()),
        onViewChange: (nextView: AgendaViewMode) =>
            setSearch({ view: nextView }),
        onShowCancelledChange: (value: boolean) =>
            setSearch({ showCancelled: value || undefined }),
        // Selecting everyone is the same as no filter, so the param is dropped.
        onProfessionalsChange: (ids: number[]) =>
            setSearch({
                professionals:
                    ids.length === professionalsCount ? undefined : ids,
            }),
    };
}
