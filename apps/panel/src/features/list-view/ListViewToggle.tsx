import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import type { ListView } from './list-view';

type ListViewToggleProps = {
    value: ListView;
    onChange: (view: ListView) => void;
};

const OPTIONS = [
    { view: 'cards', label: 'Ver como tarjetas', icon: LayoutGrid },
    { view: 'tabla', label: 'Ver como tabla', icon: List },
] as const;

export function ListViewToggle({ value, onChange }: ListViewToggleProps) {
    return (
        <div role="group" aria-label="Vista" className="flex gap-1">
            {OPTIONS.map(({ view, label, icon: Icon }) => (
                <Button
                    key={view}
                    type="button"
                    size="icon"
                    variant={value === view ? 'secondary' : 'ghost'}
                    aria-label={label}
                    aria-pressed={value === view}
                    title={label}
                    onClick={() => onChange(view)}
                >
                    <Icon />
                </Button>
            ))}
        </div>
    );
}
