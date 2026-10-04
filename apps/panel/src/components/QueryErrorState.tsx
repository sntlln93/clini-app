import { Button } from '@/components/ui/button';
import { mapToAppError, type AppError } from '@/lib/api-errors';
import { messageForAppError } from '@/lib/error-codes';
import { reloadPage } from '@/lib/external-navigation';
import { sessionQueryOptions } from '@/lib/session';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { ArrowLeft, House, LogIn, RotateCcw } from 'lucide-react';
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
    const appError = mapToAppError(error);
    const message = messageForAppError(appError);
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
                <ErrorActions kind={appError.kind} onRetry={onRetry} />
            </div>
        </div>
    );
}

// Retrying or going home can't fix a dead session (401) or a stale CSRF
// token (419) — both would fail the same way — so those offer the one action
// that does.
function ErrorActions({
    kind,
    onRetry,
}: {
    kind: AppError['kind'];
    onRetry?: () => void;
}) {
    const router = useRouter();

    const backButton = (
        <Button
            variant="outline"
            size="sm"
            onClick={() => router.history.back()}
        >
            <ArrowLeft data-icon="inline-start" />
            Volver
        </Button>
    );

    if (kind === 'unauthorized') {
        return (
            <>
                <SignInAgainButton />
                {backButton}
            </>
        );
    }

    if (kind === 'session_expired') {
        return (
            <>
                <Button size="sm" onClick={reloadPage}>
                    <RotateCcw data-icon="inline-start" />
                    Recargar página
                </Button>
                {backButton}
            </>
        );
    }

    return (
        <>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    <RotateCcw data-icon="inline-start" />
                    Reintentar
                </Button>
            )}
            {backButton}
            <Button
                variant="outline"
                size="sm"
                onClick={() => void router.navigate({ to: '/' })}
            >
                <House data-icon="inline-start" />
                Ir al inicio
            </Button>
        </>
    );
}

function SignInAgainButton() {
    const router = useRouter();
    const queryClient = useQueryClient();

    // The cached session must go first: `/login`'s guard would otherwise
    // still see the stale user and bounce back to the agenda, in a loop.
    function signIn() {
        queryClient.removeQueries({ queryKey: sessionQueryOptions.queryKey });
        void router.navigate({
            to: '/login',
            search: { redirect: router.state.location.href },
        });
    }

    return (
        <Button size="sm" onClick={signIn}>
            <LogIn data-icon="inline-start" />
            Iniciar sesión
        </Button>
    );
}
