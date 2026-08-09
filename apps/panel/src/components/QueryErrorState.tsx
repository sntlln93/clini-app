import { Button } from '@/components/ui/button';
import { mapToAppError } from '@/lib/api-errors';
import { messageForAppError } from '@/lib/error-codes';
import { cn } from '@/lib/utils';
import { useRouter } from '@tanstack/react-router';
import { ArrowLeft, House, RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';

type QueryErrorStateProps = {
    error: unknown;
    className?: string;
    onRetry?: () => void;
};

/** Copy resolves by `ErrorCode`, never the backend's own `message`. */
export function QueryErrorState({
    error,
    className,
    onRetry,
}: QueryErrorStateProps) {
    const router = useRouter();
    const message = messageForAppError(mapToAppError(error));
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        containerRef.current?.focus({ preventScroll: true });
    }, []);

    return (
        <div
            ref={containerRef}
            tabIndex={-1}
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
