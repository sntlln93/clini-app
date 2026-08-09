import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route } from '../index';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

function membership(id: number, userId: number): Membership {
    return {
        id,
        user: { id: userId, name: `User ${userId}`, email: null },
        roles: ['professional'],
        status: 'active',
        slug: null,
        deleted_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
    };
}

const PROFESSIONALS = [membership(1, 10), membership(2, 20)];

const SESSION = {
    id: 10,
    name: 'Ana Ejemplo',
    email: 'ana@clini.app',
    permissions: [] as string[],
};

function mockApiGet() {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/me') {
            return Promise.resolve({ data: SESSION });
        }
        if (url === '/memberships') {
            return Promise.resolve({ data: { data: PROFESSIONALS } });
        }
        if (
            url.startsWith('/memberships/') &&
            url.endsWith('/availabilities')
        ) {
            return Promise.resolve({ data: { data: [] } });
        }
        if (url === '/availability-exceptions') {
            return Promise.resolve({ data: { data: [] } });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

// Narrowed from the loader union to a plain callable, since this route always passes a plain async function.
const loader = Route.options.loader as (opts: {
    context: { queryClient: QueryClient };
    deps: { membershipId: number | undefined };
}) => Promise<{ selectedId: number | undefined }>;

describe('/disponibilidad loader defaultMembershipId', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGet();
    });

    it('selects the first professional when the search param is absent', async () => {
        const queryClient = new QueryClient();

        const result = await loader({
            context: { queryClient },
            deps: { membershipId: undefined },
        });

        expect(result).toMatchObject({ selectedId: PROFESSIONALS[0].id });
    });

    it('respects the search param when it matches an existing professional', async () => {
        const queryClient = new QueryClient();

        const result = await loader({
            context: { queryClient },
            deps: { membershipId: PROFESSIONALS[1].id },
        });

        expect(result).toMatchObject({ selectedId: PROFESSIONALS[1].id });
    });
});
