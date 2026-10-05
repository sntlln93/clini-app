import { QueryCache, QueryClient } from '@tanstack/react-query';
import { mapToAppError } from './api-errors';

/** Only transient kinds retry — everything else (business/validation/auth/rate-limit) is deterministic, so retrying just repeats the same rejection. */
const RETRYABLE_KINDS = new Set(['network', 'unexpected']);
const MAX_RETRIES = 2;

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        // useQuery has no `onError` in TanStack Query v5 — this is the one sink for every query failure.
        onError: (error, query) => {
            const appError = mapToAppError(error);
            const isExpectedUnauthorized =
                query.meta?.expectedUnauthorized === true &&
                appError.kind === 'unauthorized';

            // A 401 on a query marked `meta.expectedUnauthorized` (the session probe) is skipped as an expected anonymous-visitor answer; anything else still logs.
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
