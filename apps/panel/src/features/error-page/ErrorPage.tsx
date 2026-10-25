import { errorDetailsFor, mapToAppError } from '@/lib/api-errors';
import { isAppDebug } from '@/lib/app-debug';
import { messageForAppError } from '@/lib/error-codes';
import { cn } from '@/lib/utils';
import { useEffect, useRef, type ReactNode } from 'react';
import { ERROR_PAGE_COPY, HELP_URL, OFFLINE_NOTE } from './error-page-config';
import {
    errorPageVariantFor,
    errorStatusOf,
    type ErrorPageVariant,
} from './error-page-variant';
import { ErrorDebugDetails } from './ErrorDebugDetails';
import { ErrorIllustration } from './ErrorIllustration';
import { ErrorPageActions } from './ErrorPageActions';

type ErrorPageProps = {
    /** What failed; without it the page is the one for `variant`. */
    error?: unknown;
    variant?: ErrorPageVariant;
    onRetry?: () => void;
    /** Alone on the screen (no panel chrome around it). */
    fullPage?: boolean;
};

/** The friendly error page (#304); in debug mode, an unexpected error shows itself exactly instead. */
export function ErrorPage({
    error,
    variant: forcedVariant,
    onRetry,
    fullPage = false,
}: ErrorPageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const appError = error === undefined ? null : mapToAppError(error);
    const variant =
        forcedVariant ??
        (appError ? errorPageVariantFor(appError, navigator.onLine) : 'server');
    const status = appError ? errorStatusOf(appError) : null;
    // Like Laravel: the exact error replaces only an unexpected failure's page; a 404 or a 403 stays the page it is.
    const debug = isAppDebug() && variant === 'server' && error !== undefined;
    const copy = ERROR_PAGE_COPY[variant];
    // A business rule says what happened in its own words.
    const description =
        appError?.kind === 'business'
            ? messageForAppError(appError)
            : copy.description;

    useEffect(() => {
        containerRef.current?.focus({ preventScroll: true });
    }, []);

    const page = (
        <div
            ref={containerRef}
            tabIndex={-1}
            className={cn(
                'flex w-full flex-col items-center justify-center gap-8 px-4 py-10 text-center outline-none',
                fullPage ? 'min-h-svh bg-background' : 'flex-1',
            )}
        >
            {debug ? (
                <div className="grid w-full max-w-4xl min-w-0 gap-6 text-left">
                    <Eyebrow>
                        {status ? `Error ${status}` : 'Error inesperado'} · modo
                        debug
                    </Eyebrow>
                    <ErrorDebugDetails details={errorDetailsFor(error)} />
                </div>
            ) : (
                <>
                    <ErrorIllustration variant={variant} />
                    <div className="grid max-w-xl gap-3">
                        <Eyebrow>{eyebrowFor(variant, status)}</Eyebrow>
                        <h1 className="text-3xl tracking-tight sm:text-4xl">
                            {copy.title}
                        </h1>
                        <p className="text-base text-muted-foreground">
                            {description}
                        </p>
                    </div>
                </>
            )}
            <ErrorPageActions variant={variant} onRetry={onRetry} />
            <HelpLine variant={variant} />
        </div>
    );

    // Alone on the screen it is the page's main landmark; inside the chrome, the layout's `<main>` already is.
    return fullPage ? <main>{page}</main> : page;
}

function eyebrowFor(variant: ErrorPageVariant, status: number | null) {
    if (status !== null) {
        return `Error ${status}`;
    }

    if (variant === 'offline') {
        return 'Sin conexión';
    }

    if (variant === 'unavailable') {
        return 'Sin respuesta';
    }

    return variant === 'not_found' ? 'Error 404' : 'Error inesperado';
}

function Eyebrow({ children }: { children: ReactNode }) {
    return (
        <p className="text-sm font-medium tracking-[0.2em] text-primary uppercase">
            {children}
        </p>
    );
}

function HelpLine({ variant }: { variant: ErrorPageVariant }) {
    if (variant === 'offline') {
        return <p className="text-sm text-muted-foreground">{OFFLINE_NOTE}</p>;
    }

    if (!HELP_URL) {
        return null;
    }

    const persistent = ['rate_limited', 'server', 'unavailable'].includes(
        variant,
    );

    return (
        <p className="text-sm text-muted-foreground">
            {persistent ? 'Si el problema continúa, ' : '¿Necesitás ayuda? '}
            <a
                href={HELP_URL}
                className="text-primary underline underline-offset-4"
            >
                {persistent ? 'contactanos' : 'Contactanos'}
            </a>
        </p>
    );
}
