import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveIsDark, useTheme } from './use-theme';

function createMatchMedia(initial: boolean) {
    const listeners = new Set<() => void>();
    const mql = {
        matches: initial,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: (_: string, cb: () => void) => listeners.add(cb),
        removeEventListener: (_: string, cb: () => void) =>
            listeners.delete(cb),
        dispatchEvent: vi.fn(),
    };
    const emit = (next: boolean) => {
        mql.matches = next;
        listeners.forEach((cb) => cb());
    };
    return { mql, emit };
}

function stubMatchMedia(matches: boolean) {
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => createMatchMedia(matches).mql),
    );
}

afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('dark');
});

describe('resolveIsDark', () => {
    it('is dark for the explicit dark theme', () => {
        expect(resolveIsDark('dark')).toBe(true);
    });

    it('is light for the explicit light theme regardless of the system', () => {
        stubMatchMedia(true);
        expect(resolveIsDark('light')).toBe(false);
    });

    it('follows the system preference when set to system', () => {
        stubMatchMedia(true);
        expect(resolveIsDark('system')).toBe(true);
        stubMatchMedia(false);
        expect(resolveIsDark('system')).toBe(false);
    });
});

describe('useTheme', () => {
    it('applies and removes the dark class as the theme changes', () => {
        const { result } = renderHook(() => useTheme());
        act(() => result.current.setTheme('dark'));
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        act(() => result.current.setTheme('light'));
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('persists the selected theme', () => {
        const { result } = renderHook(() => useTheme());
        act(() => result.current.setTheme('dark'));
        expect(localStorage.getItem('clini-theme')).toBe('"dark"');
    });

    it('follows live system changes while set to system', () => {
        const controlled = createMatchMedia(false);
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => controlled.mql),
        );
        renderHook(() => useTheme());
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        act(() => controlled.emit(true));
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
});
