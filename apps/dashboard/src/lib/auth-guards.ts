import { safeInternalPath } from '@/lib/safe-internal-path';
import { adminSessionQueryOptions } from '@/lib/session';
import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';

type GuardContext = {
    queryClient: QueryClient;
};

type GuardLocation = {
    href: string;
    search?: unknown;
};

// Landing on the overview after login is already the default, so it doesn't
// need to travel as a `redirect` param.
const DEFAULT_DESTINATION = '/';

/** The `redirect` param that brings the operator back to `href` after login. */
function loginSearchFor(href: string | undefined) {
    const target = safeInternalPath(href);

    return target && target !== DEFAULT_DESTINATION ? { redirect: target } : {};
}

export async function requireSession({
    queryClient,
    location,
}: GuardContext & { location?: GuardLocation }) {
    try {
        await queryClient.ensureQueryData(adminSessionQueryOptions);
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
        await queryClient.ensureQueryData(adminSessionQueryOptions);
    } catch {
        return;
    }

    // An already-authenticated operator following a `/login?redirect=…` link
    // goes straight to that destination.
    const search = location?.search as { redirect?: unknown } | undefined;
    const target = safeInternalPath(search?.redirect);

    if (target) {
        throw redirect({ href: target });
    }

    throw redirect({ to: DEFAULT_DESTINATION });
}
