import type { Availability } from '@/types/availability';
import { useCallback, useMemo, useState } from 'react';
import {
    addRange,
    copyDay,
    fromSlots,
    removeRange,
    replaceRange,
    weekKey,
    type Range,
    type WeekDraft,
} from '../-components/week-draft';

type DraftState = { baseKey: string; week: WeekDraft };

/**
 * The week being edited, kept apart from the saved one until "Guardar cambios".
 * When the saved week changes (after a save, or another professional's), the
 * draft starts over from it.
 */
export function useWeekDraft(slots: readonly Availability[]) {
    const saved = useMemo(() => fromSlots(slots), [slots]);
    const savedKey = weekKey(saved);
    const [state, setState] = useState<DraftState>({
        baseKey: savedKey,
        week: saved,
    });

    // Adjusts state during render instead of in an effect (react-hooks/set-state-in-effect).
    if (state.baseKey !== savedKey) {
        setState({ baseKey: savedKey, week: saved });
    }

    const week = state.baseKey === savedKey ? state.week : saved;

    const change = useCallback(
        (next: (week: WeekDraft) => WeekDraft) =>
            setState((current) => ({ ...current, week: next(current.week) })),
        [],
    );

    const actions = useMemo(
        () => ({
            add: (day: number, range: Range) =>
                change((current) => addRange(current, day, range)),
            replace: (day: number, index: number, range: Range) =>
                change((current) => replaceRange(current, day, index, range)),
            remove: (day: number, index: number) =>
                change((current) => removeRange(current, day, index)),
            copy: (from: number, to: number[]) =>
                change((current) => copyDay(current, from, to)),
        }),
        [change],
    );

    const discard = useCallback(
        () => setState({ baseKey: savedKey, week: saved }),
        [savedKey, saved],
    );

    return {
        week,
        isDirty: weekKey(week) !== savedKey,
        discard,
        ...actions,
    };
}

export type WeekDraftActions = Pick<
    ReturnType<typeof useWeekDraft>,
    'add' | 'replace' | 'remove' | 'copy'
>;
