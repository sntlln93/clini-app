import { useTheme } from '@/hooks/use-theme';
import type { ReactNode } from 'react';

/**
 * Drives app-wide theme application. Mounting it once keeps the `.dark`
 * class in sync with the persisted preference and live system changes.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    useTheme();
    return <>{children}</>;
}
