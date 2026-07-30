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
        onError: (error) => {
            // eslint-disable-next-line no-console -- the one sanctioned sink for query failures, see rule above
            console.error('Query failed:', mapToAppError(error));
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
