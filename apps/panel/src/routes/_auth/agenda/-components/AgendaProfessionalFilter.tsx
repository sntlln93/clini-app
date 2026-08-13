import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Professional } from '@/types/professional';
import { ChevronDownIcon } from 'lucide-react';

const PILLS_THRESHOLD = 4;

type AgendaProfessionalFilterProps = {
    professionals: Professional[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
};

function professionalName(professional: Professional): string {
    return professional.user.name;
}

export function AgendaProfessionalFilter({
    professionals,
    selectedIds,
    onChange,
}: AgendaProfessionalFilterProps) {
    function toggle(id: number) {
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter((selectedId) => selectedId !== id)
                : [...selectedIds, id],
        );
    }

    if (professionals.length <= PILLS_THRESHOLD) {
        return (
            <div className="flex flex-wrap items-center gap-1.5">
                {professionals.map((professional) => {
                    const selected = selectedIds.includes(professional.id);

                    return (
                        <Button
                            key={professional.id}
                            type="button"
                            variant={selected ? 'secondary' : 'outline'}
                            size="sm"
                            aria-pressed={selected}
                            onClick={() => toggle(professional.id)}
                        >
                            {professionalName(professional)}
                        </Button>
                    );
                })}
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button type="button" variant="outline" size="sm">
                        Profesionales ({selectedIds.length}/
                        {professionals.length})
                        <ChevronDownIcon />
                    </Button>
                }
            />
            <DropdownMenuContent align="start">
                {professionals.map((professional) => (
                    <DropdownMenuCheckboxItem
                        key={professional.id}
                        checked={selectedIds.includes(professional.id)}
                        onCheckedChange={(checked) =>
                            onChange(
                                checked
                                    ? [...selectedIds, professional.id]
                                    : selectedIds.filter(
                                          (id) => id !== professional.id,
                                      ),
                            )
                        }
                    >
                        {professionalName(professional)}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
