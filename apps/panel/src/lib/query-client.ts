import { QueryCache, QueryClient } from '@tanstack/react-query';
import { mapToAppError } from './api-errors';

/**
 * Kinds worth a retry: transient failures where trying again might succeed.
 * Everything else (business rules, validation, auth/session, rate limiting)
 * is deterministic — retrying just repeats the same rejection.
 */
const RETRYABLE_KINDS = new Set(['network', 'unexpected']);
const MAX_RETRIES = 2;

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        // Centralized query-error logging: `useQuery` itself has no `onError`
        // in TanStack Query v5 (`QueryObserverOptions` doesn't declare one),
        // so this is the one place that observes every query failure.
        //
        // One exception: a query marked `meta: { expectedUnauthorized: true }`
        // (the session probe in `session.ts`) whose failure is a 401 is an
        // expected answer for an anonymous visitor, not a real failure — the
        // guards already handle it by rendering/redirecting to `/login`, so
        // logging it is just noise. Anything else — a different failure kind
        // on that same query (e.g. a mid-session 419 expiry), or a 401 on any
        // query without the flag — still logs.
        onError: (error, query) => {
            const appError = mapToAppError(error);
            const isExpectedUnauthorized =
                query.meta?.expectedUnauthorized === true &&
                appError.kind === 'unauthorized';

            if (isExpectedUnauthorized) {
                return;
            }

            // eslint-disable-next-line no-console -- the one sanctioned sink for query failures, see rule above
            console.error('Query failed:', appError);
        },
    }),
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => {
                const appError = mapToAppError(error);

                if (!RETRYABLE_KINDS.has(appError.kind)) {
                    return false;
                }

                return failureCount < MAX_RETRIES;
            },
        },
    },
});
