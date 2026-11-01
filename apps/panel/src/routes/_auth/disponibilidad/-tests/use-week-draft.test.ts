import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useWeekDraft } from '../-hooks/use-week-draft';
import { slot, SLOTS } from './weekly-schedule-helpers';

describe('useWeekDraft', () => {
    it('is dirty only while the draft differs from the saved week', () => {
        const { result } = renderHook(() => useWeekDraft(SLOTS));
        expect(result.current.isDirty).toBe(false);

        act(() => result.current.remove(1, 0));
        expect(result.current.isDirty).toBe(true);

        act(() => result.current.add(1, { start: 540, end: 780 }));
        expect(result.current.isDirty).toBe(false);
    });

    it('keeps the draft when the saved week comes back unchanged', () => {
        const { result, rerender } = renderHook(
            ({ slots }) => useWeekDraft(slots),
            { initialProps: { slots: SLOTS } },
        );
        act(() => result.current.remove(3, 0));

        rerender({ slots: [...SLOTS] });

        expect(result.current.week[3]).toEqual([]);
        expect(result.current.isDirty).toBe(true);
    });

    it('starts over from a saved week with other content (a save, another professional)', () => {
        const { result, rerender } = renderHook(
            ({ slots }) => useWeekDraft(slots),
            { initialProps: { slots: SLOTS } },
        );
        act(() => result.current.remove(3, 0));

        rerender({ slots: [slot(9, 5, '08:00', '12:00')] });

        expect(result.current.isDirty).toBe(false);
        expect(result.current.week[3]).toEqual([]);
        expect(result.current.week[5]).toEqual([{ start: 480, end: 720 }]);
    });

    it('discards back to the saved week', () => {
        const { result } = renderHook(() => useWeekDraft(SLOTS));
        act(() => result.current.copy(1, [2, 4]));
        expect(result.current.isDirty).toBe(true);

        act(() => result.current.discard());

        expect(result.current.isDirty).toBe(false);
        expect(result.current.week[2]).toEqual([]);
    });
});
