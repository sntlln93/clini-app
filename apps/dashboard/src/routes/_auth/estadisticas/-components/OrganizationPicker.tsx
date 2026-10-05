import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { useOrganizationOptions } from '../-hooks/use-organization-options';

type OrganizationPickerProps = {
    /** The active filter, labelled from the stats response's `period.organization`. */
    selected: { id: number; name: string } | null;
    onSelect: (organizationId: number | undefined) => void;
};

/** Results count for the live region, so screen readers hear that options appeared. */
function resultsStatus(count: number, isEmpty: boolean): string {
    if (isEmpty) {
        return 'Sin resultados';
    }
    if (count === 0) {
        return '';
    }

    return count === 1
        ? '1 organización encontrada'
        : `${count} organizaciones encontradas`;
}

/** An ARIA combobox: the results popup closes on Escape, blur or a pick, and the arrows move through the options. */
export function OrganizationPicker({
    selected,
    onSelect,
}: OrganizationPickerProps) {
    const inputId = useId();
    const listId = useId();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const { options, isEmpty } = useOrganizationOptions(query);

    if (selected) {
        return (
            <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-medium">Organización</span>
                <div className="flex h-8 min-w-0 items-center gap-2 rounded-lg border px-2.5">
                    <Building2
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <span className="min-w-0 truncate">{selected.name}</span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Quitar filtro de organización"
                        onClick={() => onSelect(undefined)}
                    >
                        <X />
                    </Button>
                </div>
            </div>
        );
    }

    const expanded = open && (options.length > 0 || isEmpty);
    const activeIndex = active < options.length ? active : -1;
    const optionId = (index: number) => `${listId}-option-${index}`;

    function choose(index: number) {
        const organization = options[index];
        if (!organization) {
            return;
        }
        setQuery('');
        setOpen(false);
        setActive(-1);
        onSelect(organization.id);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActive(
                Math.min(Math.max(activeIndex + step, 0), options.length - 1),
            );
        } else if (event.key === 'Enter' && expanded && activeIndex >= 0) {
            event.preventDefault();
            choose(activeIndex);
        } else if (event.key === 'Escape' && expanded) {
            event.preventDefault();
            setOpen(false);
        }
    }

    return (
        <div className="relative flex w-full min-w-0 flex-col gap-1 sm:w-64">
            <Label htmlFor={inputId}>Organización</Label>
            <Input
                id={inputId}
                role="combobox"
                aria-expanded={expanded}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                    expanded && activeIndex >= 0
                        ? optionId(activeIndex)
                        : undefined
                }
                value={query}
                placeholder="Todas · buscar por nombre…"
                autoComplete="off"
                onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                    setActive(-1);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={handleKeyDown}
            />
            <span role="status" className="sr-only">
                {expanded ? resultsStatus(options.length, isEmpty) : ''}
            </span>
            <div
                hidden={!expanded}
                className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
            >
                {isEmpty && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">
                        Sin resultados.
                    </p>
                )}
                <div id={listId} role="listbox" aria-label="Organizaciones">
                    {options.map((organization, index) => (
                        <div
                            key={organization.id}
                            id={optionId(index)}
                            role="option"
                            aria-selected={index === activeIndex}
                            tabIndex={-1}
                            className="cursor-pointer rounded-md px-2 py-1.5 text-sm hover:bg-accent aria-selected:bg-accent"
                            // mousedown, not click: picking must happen before the input's blur closes the popup.
                            onMouseDown={(event) => {
                                event.preventDefault();
                                choose(index);
                            }}
                        >
                            {organization.name}
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                                {organization.slug}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
