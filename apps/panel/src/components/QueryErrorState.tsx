import { mapToAppError } from '@/lib/api-errors';
import { messageForAppError } from '@/lib/error-codes';
import { cn } from '@/lib/utils';

type QueryErrorStateProps = {
    error: unknown;
    className?: string;
};

/**
 * Shared presentational error state for failed TanStack Query reads.
 * No domain logic, no data fetching — just message selection + styling.
 * Copy resolves by `ErrorCode` for a `BusinessError` (so
 * `organizations.no_active_membership` reads correctly everywhere it
 * renders, not just for patients) and by a generic message otherwise.
 */
export function QueryErrorState({ error, className }: QueryErrorStateProps) {
    return (
        <p className={cn('text-sm text-destructive', className)}>
            {messageForAppError(mapToAppError(error))}
        </p>
    );
}
