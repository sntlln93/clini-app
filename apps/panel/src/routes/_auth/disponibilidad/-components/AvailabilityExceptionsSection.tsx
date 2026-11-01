import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DateTime } from '@/lib/datetime';
import type { AvailabilityException } from '@/types/availability';
import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { useDeleteAvailabilityException } from '../-hooks/use-availability-exceptions';
import type { AvailabilityReadOnlyReason } from '../-hooks/use-availability-permissions';
import { AvailabilityReadOnlyNote } from './AvailabilityReadOnlyNote';
import { splitExceptions } from './exception-format';
import {
    ExceptionFormDialog,
    type ExceptionEditing,
} from './ExceptionFormDialog';
import { ExceptionList } from './ExceptionList';

type AvailabilityExceptionsSectionProps = {
    membershipId: number;
    heading: string;
    canManageOwn: boolean;
    canManageOrgWide: boolean;
    readOnlyReason: AvailabilityReadOnlyReason | null;
    exceptions: AvailabilityException[];
};

/** "Excepciones": the dates that change the weekly schedule, upcoming first and the finished ones folded away. */
export function AvailabilityExceptionsSection({
    membershipId,
    heading,
    canManageOwn,
    canManageOrgWide,
    readOnlyReason,
    exceptions,
}: AvailabilityExceptionsSectionProps) {
    const remove = useDeleteAvailabilityException(membershipId);
    const [editing, setEditing] = useState<ExceptionEditing>(null);
    const canManage = canManageOwn || canManageOrgWide;
    // Taken once on mount; it only decides which list an exception is in.
    const [now] = useState(() => DateTime.now());
    const { upcoming, past } = splitExceptions(exceptions, now);

    const listProps = {
        canManageRow: (exception: AvailabilityException) =>
            exception.membership_id === null ? canManageOrgWide : canManageOwn,
        deletingId: remove.isPending ? (remove.variables ?? null) : null,
        onEdit: (exception: AvailabilityException) => setEditing({ exception }),
        onDelete: (exception: AvailabilityException) =>
            remove.mutate(exception.id),
    };

    return (
        <section aria-labelledby="exceptions-heading" className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <h2 id="exceptions-heading" className="text-lg font-medium">
                        {heading}
                    </h2>
                    <p className="max-w-prose text-sm text-muted-foreground">
                        Estas fechas cambian la semana habitual; al terminar,
                        vuelve a regir. Los feriados nacionales y provinciales
                        ya se aplican solos.
                    </p>
                </div>
                {canManage && (
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => setEditing({})}
                    >
                        <Plus data-icon="inline-start" aria-hidden />
                        Agregar excepción
                    </Button>
                )}
            </div>

            {readOnlyReason && (
                <AvailabilityReadOnlyNote reason={readOnlyReason} />
            )}

            <div className="space-y-3">
                <h3 className="font-medium">Próximas</h3>
                {upcoming.length > 0 ? (
                    <ExceptionList exceptions={upcoming} {...listProps} />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No hay excepciones próximas.
                    </p>
                )}
            </div>

            {past.length > 0 && (
                <Collapsible className="space-y-3">
                    <CollapsibleTrigger
                        render={
                            <Button
                                type="button"
                                variant="ghost"
                                className="group -ml-2.5"
                            />
                        }
                    >
                        Anteriores ({past.length})
                        <ChevronDown
                            data-icon="inline-end"
                            aria-hidden
                            className="transition-transform group-data-panel-open:rotate-180"
                        />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <ExceptionList exceptions={past} {...listProps} />
                    </CollapsibleContent>
                </Collapsible>
            )}

            <ExceptionFormDialog
                editing={editing}
                membershipId={membershipId}
                canManageOrgWide={canManageOrgWide}
                onClose={() => setEditing(null)}
            />
        </section>
    );
}
