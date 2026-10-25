import { QueryCache, QueryClient } from '@tanstack/react-query';
import { mapToAppError, type AppError } from './api-errors';

const MAX_RETRIES = 2;

/** Only transient failures retry — everything else (business/validation/auth/rate-limit, a 404) is deterministic, so retrying just repeats the same rejection. */
function isTransient(appError: AppError): boolean {
    if (appError.kind === 'network') {
        return true;
    }

    return (
        appError.kind === 'unexpected' &&
        (appError.status === null ||
            appError.status === 408 ||
            appError.status >= 500)
    );
}

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        // useQuery has no `onError` in TanStack Query v5 — this is the one sink for every query failure.
        onError: (error, query) => {
            const appError = mapToAppError(error);
            const isExpectedUnauthorized =
                query.meta?.expectedUnauthorized === true &&
                appError.kind === 'unauthorized';
            const expectedCodes = query.meta?.expectedBusinessCodes;
            const isExpectedBusiness =
                appError.kind === 'business' &&
                Array.isArray(expectedCodes) &&
                expectedCodes.includes(appError.code);

            // A 401 on a query marked `meta.expectedUnauthorized` (the session probe) is skipped as an expected anonymous-visitor answer, and so is a business code listed in `meta.expectedBusinessCodes` that the caller handles (e.g. an expired exceptional access, #325); anything else still logs.
            if (isExpectedUnauthorized || isExpectedBusiness) {
                return;
            }

            // eslint-disable-next-line no-console -- the one sanctioned sink for query failures, see rule above
            console.error('Query failed:', appError);
        },
    }),
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => {
                if (!isTransient(mapToAppError(error))) {
                    return false;
                }

                return failureCount < MAX_RETRIES;
            },
        },
    },
});
