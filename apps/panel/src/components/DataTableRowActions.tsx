import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { LucideIcon } from 'lucide-react';
import { EllipsisIcon } from 'lucide-react';

export type RowAction = {
    label: string;
    icon: LucideIcon;
    onSelect: () => void;
    disabled?: boolean;
};

type DataTableRowActionsProps = {
    actions: RowAction[];
};

export function DataTableRowActions({ actions }: DataTableRowActionsProps) {
    if (actions.length === 0) {
        return null;
    }

    if (actions.length > 3) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Más acciones"
                        >
                            <EllipsisIcon />
                        </Button>
                    }
                />
                <DropdownMenuContent align="end">
                    {actions.map((action) => (
                        <DropdownMenuItem
                            key={action.label}
                            disabled={action.disabled}
                            onClick={action.onSelect}
                        >
                            <action.icon className="size-4" />
                            {action.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div className="flex items-center justify-end gap-1">
            {actions.map((action) => (
                <Tooltip key={action.label}>
                    <TooltipTrigger
                        render={
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={action.disabled}
                                onClick={action.onSelect}
                            >
                                <action.icon />
                                <span className="sr-only">{action.label}</span>
                            </Button>
                        }
                    />
                    <TooltipContent>{action.label}</TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}
