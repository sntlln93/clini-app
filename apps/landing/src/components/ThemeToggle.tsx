import { SegmentedControl } from '@/components/SegmentedControl';
import { useTheme, type Theme } from '@/hooks/use-theme';
import { ClientOnly } from '@tanstack/react-router';

const OPTIONS: { value: Theme; label: string }[] = [
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
];

/**
 * The saved theme lives in localStorage, which the server can't read: a
 * server-rendered toggle would show "Claro" selected on a dark page until
 * hydration. It renders on the client only, behind a same-size placeholder.
 */
export function ThemeToggle() {
    return (
        <ClientOnly fallback={<div aria-hidden="true" className="h-8 w-34" />}>
            <ThemeToggleControl />
        </ClientOnly>
    );
}

function ThemeToggleControl() {
    const { theme, setTheme } = useTheme();

    return (
        <SegmentedControl
            label="Tema"
            size="sm"
            options={OPTIONS}
            value={theme}
            onChange={setTheme}
        />
    );
}
