import { QueryClient } from '@tanstack/react-query';
import type { AnyRouter } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { refreshPageData } from './page-data';

function newQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
}

function routerStub(): Pick<AnyRouter, 'invalidate'> {
    return { invalidate: vi.fn().mockResolvedValue(undefined) };
}

describe('refreshPageData', () => {
    it('resolves the new value via ensureQueryData after a refresh, with no mounted observer', async () => {
        const queryClient = newQueryClient();
        const queryKey = ['k'];
        const queryFn = vi
            .fn()
            .mockResolvedValueOnce('v1')
            .mockResolvedValueOnce('v2');

        await expect(
            queryClient.ensureQueryData({ queryKey, queryFn }),
        ).resolves.toBe('v1');

        await refreshPageData(queryClient, routerStub(), queryKey);

        await expect(
            queryClient.ensureQueryData({ queryKey, queryFn }),
        ).resolves.toBe('v2');
    });

    it('lets the refetch settle before calling router.invalidate()', async () => {
        const queryClient = newQueryClient();
        const queryKey = ['k'];
        const order: string[] = [];
        const queryFn = vi
            .fn()
            .mockResolvedValueOnce('v1')
            .mockImplementationOnce(async () => {
                order.push('queryFn settled');
                return 'v2';
            });

        await queryClient.ensureQueryData({ queryKey, queryFn });

        const invalidate = vi.fn(async () => {
            order.push('router.invalidate called');
        });
        const router: Pick<AnyRouter, 'invalidate'> = { invalidate };

        await refreshPageData(queryClient, router, queryKey);

        expect(order).toEqual(['queryFn settled', 'router.invalidate called']);
    });

    it('refreshes several query keys in one call', async () => {
        const queryClient = newQueryClient();
        const keyA = ['a'];
        const keyB = ['b'];
        const queryFnA = vi
            .fn()
            .mockResolvedValueOnce('a1')
            .mockResolvedValueOnce('a2');
        const queryFnB = vi
            .fn()
            .mockResolvedValueOnce('b1')
            .mockResolvedValueOnce('b2');

        await queryClient.ensureQueryData({
            queryKey: keyA,
            queryFn: queryFnA,
        });
        await queryClient.ensureQueryData({
            queryKey: keyB,
            queryFn: queryFnB,
        });

        await refreshPageData(queryClient, routerStub(), keyA, keyB);

        await expect(
            queryClient.ensureQueryData({ queryKey: keyA, queryFn: queryFnA }),
        ).resolves.toBe('a2');
        await expect(
            queryClient.ensureQueryData({ queryKey: keyB, queryFn: queryFnB }),
        ).resolves.toBe('b2');
    });

    it('leaves a query key that was not passed alone', async () => {
        const queryClient = newQueryClient();
        const keyA = ['a'];
        const keyB = ['b'];
        const queryFnA = vi
            .fn()
            .mockResolvedValueOnce('a1')
            .mockResolvedValueOnce('a2');
        const queryFnB = vi.fn().mockResolvedValueOnce('b1');

        await queryClient.ensureQueryData({
            queryKey: keyA,
            queryFn: queryFnA,
        });
        await queryClient.ensureQueryData({
            queryKey: keyB,
            queryFn: queryFnB,
        });

        await refreshPageData(queryClient, routerStub(), keyA);

        expect(queryFnB).toHaveBeenCalledTimes(1);
    });

    it('resolves only after router.invalidate() resolves', async () => {
        const queryClient = newQueryClient();
        const queryKey = ['k'];
        await queryClient.ensureQueryData({
            queryKey,
            queryFn: () => Promise.resolve('v1'),
        });

        let resolveInvalidate: () => void = () => {};
        const invalidate = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveInvalidate = resolve;
                }),
        );
        const router: Pick<AnyRouter, 'invalidate'> = { invalidate };

        let settled = false;
        const promise = refreshPageData(queryClient, router, queryKey).then(
            () => {
                settled = true;
            },
        );

        // Flush microtasks (the refetch triggered by invalidateQueries) via a
        // macrotask boundary before asserting the outer promise is still pending.
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(settled).toBe(false);

        resolveInvalidate();
        await promise;
        expect(settled).toBe(true);
    });
});
