import { api } from '@/lib/api';
import { fromInstant } from '@/lib/datetime';
import { sessionQueryOptions } from '@/lib/session';
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
    access_ends_at: null,
    amount: null,
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

// Narrowed like `loader` above.
const beforeLoad = Route.options.beforeLoad as (opts: {
    context: { queryClient: QueryClient };
    location: { href: string };
}) => Promise<void>;

describe('/_auth beforeLoad', () => {
    it("makes the practice's zone the default before any guarded page reads a date (#265)", async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(sessionQueryOptions.queryKey, {
            id: 10,
            name: 'Ana Ejemplo',
            email: 'ana@clini.app',
            organization: {
                id: 1,
                name: 'Consultorio Norte',
                slug: 'consultorio-norte',
                timezone: 'America/Bogota',
            },
        });

        await beforeLoad({
            context: { queryClient },
            location: { href: '/agenda' },
        });

        // 14:00 UTC is 09:00 in Bogotá, while the browser (Buenos Aires) would read 11:00.
        expect(fromInstant('2026-10-12T14:00:00Z').hour).toBe(9);
    });
});
