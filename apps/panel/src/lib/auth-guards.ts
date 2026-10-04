import { safeInternalPath } from '@/lib/safe-internal-path';
import { sessionQueryOptions } from '@/lib/session';
import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';

type GuardContext = {
    queryClient: QueryClient;
};

type GuardLocation = {
    href: string;
    search?: unknown;
};

// Landing on either after login is already the default, so they don't need
// to travel as a `redirect` param.
const DEFAULT_DESTINATIONS = new Set(['/', '/agenda']);

/** The `redirect` param that brings the user back to `href` after login. */
function loginSearchFor(href: string | undefined) {
    const target = safeInternalPath(href);

    return target && !DEFAULT_DESTINATIONS.has(target)
        ? { redirect: target }
        : {};
}

export async function requireSession({
    queryClient,
    location,
}: GuardContext & { location?: GuardLocation }) {
    try {
        await queryClient.ensureQueryData(sessionQueryOptions);
    } catch {
        throw redirect({
            to: '/login',
            search: loginSearchFor(location?.href),
        });
    }
}

export async function redirectIfAuthenticated({
    queryClient,
    location,
}: GuardContext & { location?: GuardLocation }) {
    try {
        await queryClient.ensureQueryData(sessionQueryOptions);
    } catch {
        return;
    }

    // An already-authenticated visitor following a `/login?redirect=…` link
    // goes straight to that destination.
    const search = location?.search as { redirect?: unknown } | undefined;
    const target = safeInternalPath(search?.redirect);

    if (target) {
        throw redirect({ href: target });
    }

    throw redirect({ to: '/agenda' });
}
