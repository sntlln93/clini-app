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

const OWN_MEMBERSHIP = membership(1, 10);

function mockApiGetWithoutMembershipsView() {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/me') {
            return Promise.resolve({
                data: {
                    id: 10,
                    name: 'Ana Ejemplo',
                    email: 'ana@clini.app',
                    permissions: [],
                    membership: OWN_MEMBERSHIP,
                },
            });
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
}) => Promise<{
    professionals: Membership[];
    selectedId: number | undefined;
}>;

describe('/disponibilidad loader without memberships.view', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGetWithoutMembershipsView();
    });

    it("resolves without /memberships and defaults the selected membership to the caller's own", async () => {
        const queryClient = new QueryClient();

        const result = await loader({
            context: { queryClient },
            deps: { membershipId: undefined },
        });

        expect(
            vi
                .mocked(api.get)
                .mock.calls.some(([url]) => url === '/memberships'),
        ).toBe(false);
        expect(result).toMatchObject({
            professionals: [OWN_MEMBERSHIP],
            selectedId: OWN_MEMBERSHIP.id,
        });
    });
});
