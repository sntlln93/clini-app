import { QueryErrorState } from '@/components/QueryErrorState';
import { Button } from '@/components/ui/button';
import type { AvailabilityException } from '@/types/availability';
import { useState } from 'react';
import {
    useAvailabilityExceptions,
    useDeleteAvailabilityException,
} from '../-hooks/use-availability-exceptions';
import { AvailabilityExceptionForm } from './AvailabilityExceptionForm';

const TYPE_LABELS: Record<AvailabilityException['type'], string> = {
    blocked: 'Bloqueo',
    extra: 'Extra',
};

type AvailabilityExceptionsSectionProps = {
    membershipId: number;
    canManageOwn: boolean;
    canManageOrgWide: boolean;
};

export function AvailabilityExceptionsSection({
    membershipId,
    canManageOwn,
    canManageOrgWide,
}: AvailabilityExceptionsSectionProps) {
    const {
        data: exceptions,
        isPending,
        isError,
        error,
    } = useAvailabilityExceptions(membershipId);
    const remove = useDeleteAvailabilityException(membershipId);
    const [editing, setEditing] = useState<AvailabilityException | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const canManage = canManageOwn || canManageOrgWide;

    function canManageRow(exception: AvailabilityException): boolean {
        return exception.membership_id === null
            ? canManageOrgWide
            : canManageOwn;
    }

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">Excepciones</h2>
                {canManage && !isCreating && !editing && (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsCreating(true)}
                    >
                        Agregar excepción
                    </Button>
                )}
            </div>

            {isError && <QueryErrorState error={error} />}

            {!isError && isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}

            {isCreating && (
                <AvailabilityExceptionForm
                    membershipId={membershipId}
                    canManageOrgWide={canManageOrgWide}
                    onDone={() => setIsCreating(false)}
                />
            )}

            {!isError &&
                !isPending &&
                exceptions &&
                exceptions.length === 0 &&
                !isCreating && (
                    <p className="text-sm text-muted-foreground">
                        No hay excepciones cargadas.
                    </p>
                )}

            {!isError && !isPending && exceptions && (
                <div className="space-y-2">
                    {exceptions.map((exception) =>
                        editing?.id === exception.id ? (
                            <AvailabilityExceptionForm
                                key={exception.id}
                                membershipId={membershipId}
                                canManageOrgWide={canManageOrgWide}
                                exception={exception}
                                onDone={() => setEditing(null)}
                            />
                        ) : (
                            <div
                                key={exception.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                            >
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">
                                        {TYPE_LABELS[exception.type]}
                                        {exception.membership_id === null && (
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                Toda la organización
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {exception.start_at} —{' '}
                                        {exception.end_at}
                                    </p>
                                    {exception.reason && (
                                        <p className="text-xs text-muted-foreground">
                                            {exception.reason}
                                        </p>
                                    )}
                                </div>
                                {canManageRow(exception) && (
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                setEditing(exception)
                                            }
                                        >
                                            Editar
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={remove.isPending}
                                            onClick={() =>
                                                remove.mutate(exception.id)
                                            }
                                        >
                                            Eliminar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ),
                    )}
                </div>
            )}
        </section>
    );
}
