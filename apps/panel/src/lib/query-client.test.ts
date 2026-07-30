import { describe, expect, it } from 'vitest';
import { queryClient } from './query-client';

function axiosError(status: number, data: unknown = {}) {
    return { isAxiosError: true, response: { status, data } };
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
