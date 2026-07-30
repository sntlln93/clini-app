import { Button } from '@/components/ui/button';
import { mapToAppError } from '@/lib/api-errors';
import { messageForAppError } from '@/lib/error-codes';
import { cn } from '@/lib/utils';
import { useRouter } from '@tanstack/react-router';
import { ArrowLeft, House, RotateCcw } from 'lucide-react';

type QueryErrorStateProps = {
    error: unknown;
    className?: string;
    onRetry?: () => void;
};

/**
 * Shared recovery UI for a failed TanStack Query read reaching a route's
 * `errorComponent` (via `RouteErrorState`, its only remaining consumer).
 * No domain logic, no data fetching of its own — just message selection,
 * styling and the three ways CLAUDE.md requires to recover: retry (when the
 * caller has a `reset`), go back, go to the panel's home.
 *
 * Copy resolves by `ErrorCode` for a `BusinessError` (so
 * `organizations.no_active_membership` reads correctly everywhere it
 * renders, not just for patients) and by a generic message otherwise —
 * never the backend's own `message`.
 */
export function QueryErrorState({
    error,
    className,
    onRetry,
}: QueryErrorStateProps) {
    const router = useRouter();
    const message = messageForAppError(mapToAppError(error));

    return (
        <div
            className={cn(
                'flex flex-col items-center gap-4 rounded-md border border-dashed p-10 text-center',
                className,
            )}
        >
            <p className="text-sm text-destructive">{message}</p>
            <div className="flex flex-wrap justify-center gap-2">
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        <RotateCcw data-icon="inline-start" />
                        Reintentar
                    </Button>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.history.back()}
                >
                    <ArrowLeft data-icon="inline-start" />
                    Volver
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void router.navigate({ to: '/' })}
                >
                    <House data-icon="inline-start" />
                    Ir al inicio
                </Button>
            </div>
        </div>
    );
}
