import { useEffect } from 'react';
import { usePersistedState } from './use-persisted-state';

export type Theme = 'light' | 'dark';

/** Read by the inline script in the root route's <head> too. */
export const THEME_STORAGE_KEY = 'clini-landing-theme';

/**
 * Light by default: unlike the panel, the landing doesn't follow the OS
 * theme on its own — a white page reads best, and dark is an explicit choice.
 */
export function useTheme() {
    const [theme, setTheme] = usePersistedState<Theme>(
        THEME_STORAGE_KEY,
        'light',
    );

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    return { theme, setTheme };
}
