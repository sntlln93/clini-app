import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusPill } from '@/components/StatusPill';
import { Button } from '@/components/ui/button';
import type { AvailabilityException } from '@/types/availability';
import { Building2, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import {
    EXCEPTION_TYPE_LABELS,
    EXCEPTION_TYPE_TONES,
    formatExceptionDates,
    formatExceptionDetail,
} from './exception-format';

type ExceptionItemProps = {
    exception: AvailabilityException;
    canManage: boolean;
    isDeleting: boolean;
    onEdit: () => void;
    onDelete: () => void;
};

export function ExceptionItem({
    exception,
    canManage,
    isDeleting,
    onEdit,
    onDelete,
}: ExceptionItemProps) {
    const typeLabel = EXCEPTION_TYPE_LABELS[exception.type];
    const title = exception.reason ?? typeLabel;
    const dates = formatExceptionDates(exception.start_at, exception.end_at);
    const name = `${title}, ${dates}`;

    return (
        <li className="flex items-start gap-3 rounded-3xl border bg-card p-4">
            <CalendarDays
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            />
            <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm text-muted-foreground tabular-nums">
                    {dates}
                </p>
                <p className="font-medium wrap-break-word">{title}</p>
                <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={EXCEPTION_TYPE_TONES[exception.type]}>
                        {typeLabel}
                    </StatusPill>
                    {exception.membership_id === null && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 aria-hidden className="size-3.5" />
                            Todo el consultorio
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground tabular-nums">
                    {formatExceptionDetail(
                        exception.start_at,
                        exception.end_at,
                    )}
                </p>
            </div>
            {canManage && (
                <div className="flex shrink-0 gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${name}`}
                        onClick={onEdit}
                    >
                        <Pencil aria-hidden />
                    </Button>
                    <ConfirmDialog
                        trigger={
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Eliminar ${name}`}
                                disabled={isDeleting}
                                className="text-destructive"
                            >
                                <Trash2 aria-hidden />
                            </Button>
                        }
                        title="Eliminar excepción"
                        description="Se quita esta excepción y esas fechas vuelven a regirse por la semana habitual."
                        confirmLabel="Eliminar"
                        onConfirm={onDelete}
                        isPending={isDeleting}
                    />
                </div>
            )}
        </li>
    );
}
