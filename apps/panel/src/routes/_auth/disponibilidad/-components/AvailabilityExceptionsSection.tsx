import { Button } from '@/components/ui/button';
import type { AvailabilityException } from '@/types/availability';
import { useState } from 'react';
import { useDeleteAvailabilityException } from '../-hooks/use-availability-exceptions';
import type { AvailabilityReadOnlyReason } from '../-hooks/use-availability-permissions';
import { AvailabilityExceptionForm } from './AvailabilityExceptionForm';
import { AvailabilityExceptionRow } from './AvailabilityExceptionRow';
import { AvailabilityReadOnlyNote } from './AvailabilityReadOnlyNote';

type AvailabilityExceptionsSectionProps = {
    membershipId: number;
    canManageOwn: boolean;
    canManageOrgWide: boolean;
    readOnlyReason: AvailabilityReadOnlyReason | null;
    exceptions: AvailabilityException[];
};

export function AvailabilityExceptionsSection({
    membershipId,
    canManageOwn,
    canManageOrgWide,
    readOnlyReason,
    exceptions,
}: AvailabilityExceptionsSectionProps) {
    const remove = useDeleteAvailabilityException(membershipId);
    const [editing, setEditing] = useState<AvailabilityException | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const canManage = canManageOwn || canManageOrgWide;
    // Taken once on mount; it only decides which rows read as finished.
    const [now] = useState(() => new Date());

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

            {!canManage && readOnlyReason && (
                <AvailabilityReadOnlyNote reason={readOnlyReason} />
            )}

            {isCreating && (
                <AvailabilityExceptionForm
                    membershipId={membershipId}
                    canManageOrgWide={canManageOrgWide}
                    onDone={() => setIsCreating(false)}
                />
            )}

            {exceptions.length === 0 && !isCreating && (
                <p className="text-sm text-muted-foreground">
                    No hay excepciones cargadas.
                </p>
            )}

            {exceptions.length > 0 && (
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
                            <AvailabilityExceptionRow
                                key={exception.id}
                                exception={exception}
                                now={now}
                                canManage={canManageRow(exception)}
                                isDeleting={remove.isPending}
                                onEdit={() => setEditing(exception)}
                                onDelete={() => remove.mutate(exception.id)}
                            />
                        ),
                    )}
                </div>
            )}
        </section>
    );
}
