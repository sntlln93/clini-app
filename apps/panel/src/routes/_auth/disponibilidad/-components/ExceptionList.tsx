import type { AvailabilityException } from '@/types/availability';
import { ExceptionItem } from './ExceptionItem';

type ExceptionListProps = {
    exceptions: AvailabilityException[];
    canManageRow: (exception: AvailabilityException) => boolean;
    deletingId: number | null;
    onEdit: (exception: AvailabilityException) => void;
    onDelete: (exception: AvailabilityException) => void;
};

export function ExceptionList({
    exceptions,
    canManageRow,
    deletingId,
    onEdit,
    onDelete,
}: ExceptionListProps) {
    return (
        <ul className="space-y-3">
            {exceptions.map((exception) => (
                <ExceptionItem
                    key={exception.id}
                    exception={exception}
                    canManage={canManageRow(exception)}
                    isDeleting={deletingId === exception.id}
                    onEdit={() => onEdit(exception)}
                    onDelete={() => onDelete(exception)}
                />
            ))}
        </ul>
    );
}
