import { api } from '@/lib/api';
import { subscriptionQueryOptions } from '@/lib/subscription';
import type { Membership } from '@/types/membership';
import type { Subscription } from '@/types/subscription';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route } from '../_auth';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

const MEMBERSHIP: Membership = {
    id: 1,
    user: { id: 10, name: 'Ana Ejemplo', email: null },
    roles: ['owner'],
    status: 'active',
    slug: null,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
};

const EXPIRED_SUBSCRIPTION: Subscription = {
    status: 'expired',
    restricted: true,
    grace_ends_at: null,
    grace_days_left: null,
    last_payment_at: null,
    last_payment_failed_at: '2026-10-03T12:00:00+00:00',
    next_payment_at: null,
    cancelled_at: null,
};

// Narrowed from the loader union to a plain callable, since this route always passes a plain async function.
const loader = Route.options.loader as (opts: {
    context: { queryClient: QueryClient };
}) => Promise<void>;

function mockApiGet(
    membership: Membership | null,
    subscription: () => Promise<unknown>,
) {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/me') {
            return Promise.resolve({
                data: {
                    id: 10,
                    name: 'Ana Ejemplo',
                    email: 'ana@clini.app',
                    permissions: [],
                    membership,
                },
            });
        }
        if (url === '/subscription') {
            return subscription();
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

describe('/_auth loader', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('reads the subscription into the cache for an active membership', async () => {
        mockApiGet(MEMBERSHIP, () =>
            Promise.resolve({ data: { data: EXPIRED_SUBSCRIPTION } }),
        );
        const queryClient = new QueryClient();

        await loader({ context: { queryClient } });

        expect(api.get).toHaveBeenCalledWith('/subscription');
        expect(
            queryClient.getQueryData(subscriptionQueryOptions.queryKey),
        ).toEqual(EXPIRED_SUBSCRIPTION);
    });

    it('never requests /subscription without an active membership', async () => {
        mockApiGet(null, () => Promise.reject(new Error('not expected')));
        const queryClient = new QueryClient();

        await loader({ context: { queryClient } });

        expect(api.get).not.toHaveBeenCalledWith('/subscription');
        expect(
            queryClient.getQueryData(subscriptionQueryOptions.queryKey),
        ).toBeUndefined();
    });

    it('resolves without throwing when the subscription read fails', async () => {
        mockApiGet(MEMBERSHIP, () =>
            Promise.reject(new Error('500 Internal Server Error')),
        );
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });

        await expect(
            loader({ context: { queryClient } }),
        ).resolves.toBeUndefined();
        expect(api.get).toHaveBeenCalledWith('/subscription');
    });
});
