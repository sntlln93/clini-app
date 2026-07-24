import { useEffect } from 'react';
import { usePersistedState } from './use-persisted-state';

export type Theme = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'clini-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
    return window.matchMedia(DARK_QUERY).matches;
}

export function resolveIsDark(theme: Theme): boolean {
    return theme === 'dark' || (theme === 'system' && systemPrefersDark());
}

function applyTheme(isDark: boolean): void {
    document.documentElement.classList.toggle('dark', isDark);
}

/**
 * Reads/writes the persisted theme preference and applies the resolved
 * `.dark` class to `<html>`. When the preference is `system`, it follows
 * live `prefers-color-scheme` changes.
 */
export function useTheme() {
    const [theme, setTheme] = usePersistedState<Theme>(
        THEME_STORAGE_KEY,
        'system',
    );

    useEffect(() => {
        applyTheme(resolveIsDark(theme));
    }, [theme]);

    useEffect(() => {
        if (theme !== 'system') return;
        const mql = window.matchMedia(DARK_QUERY);
        const onChange = () => applyTheme(resolveIsDark('system'));
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [theme]);

    return { theme, setTheme, isDark: resolveIsDark(theme) };
}
