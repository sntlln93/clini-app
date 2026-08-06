import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from './query-client';

function axiosError(status: number, data: unknown = {}) {
    return { isAxiosError: true, response: { status, data } };
}

/** Axios-shaped rejection with no `response` at all — maps to NetworkError. */
function networkError() {
    return { isAxiosError: true };
}

let queryKeySeq = 0;

/**
 * Runs a failing query through the real `queryClient`'s cache so its
 * `QueryCache.onError` sink (the thing under test) actually fires — a bare
 * `new QueryClient()` has no such sink, see `auth-guards.test.ts`. Each call
 * uses a fresh key so per-test cache state never leaks into the next test.
 */
async function runFailingQuery(error: unknown, meta?: Record<string, unknown>) {
    queryKeySeq += 1;
    await queryClient
        .fetchQuery({
            queryKey: ['query-client-test', queryKeySeq],
            queryFn: () => Promise.reject(error),
            retry: false,
            meta,
        })
        .catch(() => {
            // expected: the query rejects — the assertion is on console.error.
        });
}

function retry(failureCount: number, error: unknown): boolean {
    const policy = queryClient.getDefaultOptions().queries?.retry;
    if (typeof policy !== 'function') {
        throw new Error('expected queries.retry to be a function');
    }

    return policy(failureCount, error as Error);
}

describe('queryClient retry policy', () => {
    it('does not retry a BusinessError (domain envelope, any status)', () => {
        const error = axiosError(409, {
            error: {
                code: 'appointments.slot_taken',
                message: 'x',
                context: {},
            },
        });

        expect(retry(0, error)).toBe(false);
    });

    it('does not retry a native 422 ValidationError', () => {
        expect(retry(0, axiosError(422))).toBe(false);
    });

    it('does not retry a 401 UnauthorizedError', () => {
        expect(retry(0, axiosError(401))).toBe(false);
    });

    it('does not retry a 419 SessionExpiredError', () => {
        expect(retry(0, axiosError(419))).toBe(false);
    });

    it('does not retry a 429 RateLimitedError', () => {
        expect(retry(0, axiosError(429))).toBe(false);
    });

    it('retries a 500 UnexpectedError while below the cap', () => {
        expect(retry(0, axiosError(500))).toBe(true);
        expect(retry(1, axiosError(500))).toBe(true);
    });

    it('stops retrying a 500 UnexpectedError once the cap of 2 is reached', () => {
        expect(retry(2, axiosError(500))).toBe(false);
    });

    it('retries a NetworkError (no response) while below the cap', () => {
        expect(retry(0, new Error('Network Error'))).toBe(true);
    });
});

describe('queryClient error-logging sink', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('does not log a 401 UnauthorizedError on a query marked expectedUnauthorized', async () => {
        await runFailingQuery(axiosError(401), { expectedUnauthorized: true });

        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('logs a non-401 error on a query marked expectedUnauthorized (proves the kind gate, not a blanket meta bypass)', async () => {
        await runFailingQuery(axiosError(500), { expectedUnauthorized: true });
        await runFailingQuery(networkError(), { expectedUnauthorized: true });

        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });

    it('logs a 401 UnauthorizedError on a query without the expectedUnauthorized meta (proves there is no blanket 401 suppression)', async () => {
        await runFailingQuery(axiosError(401));

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('logs a 419 SessionExpiredError even on a query marked expectedUnauthorized (mid-session expiry must keep logging)', async () => {
        await runFailingQuery(axiosError(419), { expectedUnauthorized: true });

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
});
