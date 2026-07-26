import { describe, expect, it } from 'vitest';
import { queryClient } from './query-client';

function axiosError(status: number) {
    return { isAxiosError: true, response: { status } };
}

function retry(failureCount: number, error: unknown): boolean {
    const policy = queryClient.getDefaultOptions().queries?.retry;
    if (typeof policy !== 'function') {
        throw new Error('expected queries.retry to be a function');
    }

    return policy(failureCount, error as Error);
}

describe('queryClient retry policy', () => {
    it('does not retry a 403 axios error', () => {
        expect(retry(0, axiosError(403))).toBe(false);
    });

    it('does not retry a 400 axios error', () => {
        expect(retry(0, axiosError(400))).toBe(false);
    });

    it('does not retry a 422 axios error', () => {
        expect(retry(0, axiosError(422))).toBe(false);
    });

    it('retries a 500 axios error while below the cap', () => {
        expect(retry(0, axiosError(500))).toBe(true);
        expect(retry(1, axiosError(500))).toBe(true);
    });

    it('stops retrying a 500 axios error once the cap of 2 is reached', () => {
        expect(retry(2, axiosError(500))).toBe(false);
    });

    it('retries a network-style error with no response while below the cap', () => {
        expect(retry(0, new Error('Network Error'))).toBe(true);
    });
});
