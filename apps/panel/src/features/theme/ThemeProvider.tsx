import { useTheme } from '@/hooks/use-theme';
import type { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
    useTheme();
    return <>{children}</>;
}
