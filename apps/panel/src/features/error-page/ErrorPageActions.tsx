import { Button } from '@/components/ui/button';
import { reloadPage } from '@/lib/external-navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { ArrowLeft, LogIn, RotateCcw, UserRound } from 'lucide-react';
import { HOME_ACTION, useLogout } from './error-page-config';
import type { ErrorPageVariant } from './error-page-variant';

type Action = 'home' | 'back' | 'retry' | 'reload' | 'signIn' | 'switchAccount';

// The first one is the way out the page leads to. Retrying can't fix a dead
// session (401) or a stale CSRF token (419) — both would fail the same way —
// so those offer the one action that does.
const ACTIONS: Record<ErrorPageVariant, [Action, Action]> = {
    bad_request: ['home', 'back'],
    unauthorized: ['signIn', 'back'],
    forbidden: ['home', 'switchAccount'],
    not_found: ['home', 'back'],
    timeout: ['retry', 'back'],
    session_expired: ['reload', 'signIn'],
    rate_limited: ['retry', 'home'],
    server: ['retry', 'home'],
    unavailable: ['retry', 'home'],
    offline: ['retry', 'back'],
};

type ErrorPageActionsProps = {
    variant: ErrorPageVariant;
    /** Re-runs what failed; without it, retrying reloads the page. */
    onRetry?: () => void;
};

export function ErrorPageActions({ variant, onRetry }: ErrorPageActionsProps) {
    const [primary, secondary] = ACTIONS[variant];

    return (
        <div className="flex flex-wrap justify-center gap-3">
            <ErrorAction action={primary} onRetry={onRetry} />
            <ErrorAction action={secondary} onRetry={onRetry} outline />
        </div>
    );
}

function ErrorAction({
    action,
    onRetry,
    outline = false,
}: {
    action: Action;
    onRetry?: () => void;
    outline?: boolean;
}) {
    const router = useRouter();
    const variant = outline ? 'outline' : 'default';

    switch (action) {
        case 'home':
            return (
                <Button
                    variant={variant}
                    size="lg"
                    nativeButton={false}
                    render={<Link to={HOME_ACTION.to} />}
                >
                    <HOME_ACTION.icon data-icon="inline-start" />
                    {HOME_ACTION.label}
                </Button>
            );
        case 'back':
            return router.history.canGoBack() ? (
                <Button
                    variant={variant}
                    size="lg"
                    onClick={() => router.history.back()}
                >
                    <ArrowLeft data-icon="inline-start" />
                    Volver atrás
                </Button>
            ) : null;
        case 'retry':
        case 'reload':
            return (
                <Button
                    variant={variant}
                    size="lg"
                    onClick={
                        action === 'retry' && onRetry ? onRetry : reloadPage
                    }
                >
                    <RotateCcw data-icon="inline-start" />
                    {action === 'retry' ? 'Reintentar' : 'Actualizar página'}
                </Button>
            );
        case 'signIn':
            return <SignInAgainButton variant={variant} />;
        case 'switchAccount':
            return <SwitchAccountButton variant={variant} />;
    }
}

type ButtonVariant = { variant: 'default' | 'outline' };

function SignInAgainButton({ variant }: ButtonVariant) {
    const router = useRouter();
    const queryClient = useQueryClient();

    // The whole cache goes, not just the session: `/login`'s guard would
    // otherwise bounce the stale user back, and the redirect target's loaders
    // would serve the dead session's (possibly another tenant's) data.
    function signIn() {
        queryClient.clear();
        void router.navigate({
            to: '/login',
            search: { redirect: router.state.location.href },
        });
    }

    return (
        <Button variant={variant} size="lg" onClick={signIn}>
            <LogIn data-icon="inline-start" />
            Iniciar sesión
        </Button>
    );
}

function SwitchAccountButton({ variant }: ButtonVariant) {
    const logout = useLogout();

    return (
        <Button
            variant={variant}
            size="lg"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
        >
            <UserRound data-icon="inline-start" />
            Cambiar de cuenta
        </Button>
    );
}
