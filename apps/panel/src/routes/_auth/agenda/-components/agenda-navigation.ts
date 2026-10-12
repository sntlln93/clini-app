import { DateTime, toCalendarDate } from '@/lib/datetime';
import type { AgendaViewMode } from './AgendaToolbar';

export type AgendaSearchPatch = {
    date?: string;
    view?: AgendaViewMode;
    professionals?: number[];
    showCancelled?: boolean;
};

type AgendaNavigationOptions = {
    date: DateTime;
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
    const updateDate = (next: DateTime) =>
        setSearch({ date: toCalendarDate(next) });

    return {
        updateDate,
        onPrev: () => updateDate(date.minus({ days: step })),
        onNext: () => updateDate(date.plus({ days: step })),
        onToday: () => updateDate(DateTime.now()),
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
