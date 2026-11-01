import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProgressMessages } from './use-progress-messages';

const MESSAGES = ['Uno', 'Dos', 'Tres'];

describe('useProgressMessages', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('steps through the messages and stays on the last one', () => {
        const { result } = renderHook(() =>
            useProgressMessages(MESSAGES, 1000),
        );

        expect(result.current).toBe('Uno');
        act(() => vi.advanceTimersByTime(1000));
        expect(result.current).toBe('Dos');
        act(() => vi.advanceTimersByTime(1000));
        expect(result.current).toBe('Tres');
        act(() => vi.advanceTimersByTime(5000));
        expect(result.current).toBe('Tres');
    });

    it('starts over from the first message when mounted again', () => {
        const first = renderHook(() => useProgressMessages(MESSAGES, 1000));
        act(() => vi.advanceTimersByTime(3000));
        first.unmount();

        const { result } = renderHook(() =>
            useProgressMessages(MESSAGES, 1000),
        );

        expect(result.current).toBe('Uno');
    });
});
