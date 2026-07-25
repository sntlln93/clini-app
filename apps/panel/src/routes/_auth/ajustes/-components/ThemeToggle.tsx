import { Button } from '@/components/ui/button';
import { useTheme, type Theme } from '@/hooks/use-theme';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ComponentType } from 'react';

type Option = {
    value: Theme;
    label: string;
    icon: ComponentType<{ className?: string }>;
};

const OPTIONS: Option[] = [
    { value: 'system', label: 'Sistema', icon: Monitor },
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
];

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div
            role="radiogroup"
            aria-label="Tema"
            className="flex flex-wrap gap-2"
        >
            {OPTIONS.map((option) => {
                const selected = theme === option.value;
                return (
                    <Button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        variant={selected ? 'default' : 'outline'}
                        onClick={() => setTheme(option.value)}
                    >
                        <option.icon className="size-4" />
                        {option.label}
                    </Button>
                );
            })}
        </div>
    );
}
