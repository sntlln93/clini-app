import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePersistedState } from './use-persisted-state';

describe('usePersistedState', () => {
    it('falls back to the initial value when nothing is stored', () => {
        const { result } = renderHook(() => usePersistedState('k', 'initial'));
        expect(result.current[0]).toBe('initial');
    });

    it('reads an existing stored value', () => {
        localStorage.setItem('k', JSON.stringify('stored'));
        const { result } = renderHook(() => usePersistedState('k', 'initial'));
        expect(result.current[0]).toBe('stored');
    });

    it('persists an in-tab update and exposes the new value', () => {
        const { result } = renderHook(() => usePersistedState('count', 0));
        act(() => result.current[1](5));
        expect(result.current[0]).toBe(5);
        expect(localStorage.getItem('count')).toBe('5');
    });

    it('supports functional updates', () => {
        const { result } = renderHook(() => usePersistedState('count', 1));
        act(() => result.current[1]((prev) => prev + 1));
        expect(result.current[0]).toBe(2);
    });

    it('keeps two in-tab consumers of the same key in sync', () => {
        const { result } = renderHook(() => ({
            a: usePersistedState('shared', 0),
            b: usePersistedState('shared', 0),
        }));
        act(() => result.current.a[1](9));
        expect(result.current.b[0]).toBe(9);
    });

    it('reacts to external localStorage changes via the storage event', () => {
        const { result } = renderHook(() => usePersistedState('k', 'a'));
        act(() => {
            localStorage.setItem('k', JSON.stringify('external'));
            window.dispatchEvent(new StorageEvent('storage', { key: 'k' }));
        });
        expect(result.current[0]).toBe('external');
    });

    it('falls back to the initial value when the stored JSON is corrupt', () => {
        localStorage.setItem('k', '{not-json');
        const { result } = renderHook(() => usePersistedState('k', 'safe'));
        expect(result.current[0]).toBe('safe');
    });
});
