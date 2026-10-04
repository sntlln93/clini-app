import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AvailabilityException } from '@/types/availability';
import { formatExceptionRange, isExceptionFinished } from './exception-format';

const TYPE_LABELS: Record<AvailabilityException['type'], string> = {
    blocked: 'Bloqueo',
    extra: 'Extra',
};

type AvailabilityExceptionRowProps = {
    exception: AvailabilityException;
    now: Date;
    canManage: boolean;
    isDeleting: boolean;
    onEdit: () => void;
    onDelete: () => void;
};

export function AvailabilityExceptionRow({
    exception,
    now,
    canManage,
    isDeleting,
    onEdit,
    onDelete,
}: AvailabilityExceptionRowProps) {
    const finished = isExceptionFinished(exception.end_at, now);

    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-between gap-2 rounded-md border p-3',
                finished && 'opacity-60',
            )}
        >
            <div className="min-w-0 space-y-0.5">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {TYPE_LABELS[exception.type]}
                    {finished && <Badge variant="secondary">Finalizada</Badge>}
                    {exception.membership_id === null && (
                        <span className="text-xs font-normal text-muted-foreground">
                            Toda la organización
                        </span>
                    )}
                </p>
                <p className="text-xs text-muted-foreground">
                    {formatExceptionRange(exception.start_at, exception.end_at)}
                </p>
                {exception.reason && (
                    <p className="text-xs text-muted-foreground">
                        {exception.reason}
                    </p>
                )}
            </div>
            {canManage && (
                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={onEdit}
                    >
                        Editar
                    </Button>
                    <ConfirmDialog
                        trigger={
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={isDeleting}
                            >
                                Eliminar
                            </Button>
                        }
                        title="Eliminar excepción"
                        description="Se quita esta excepción y ese período vuelve a regirse por la disponibilidad semanal habitual."
                        onConfirm={onDelete}
                        isPending={isDeleting}
                    />
                </div>
            )}
        </div>
    );
}
