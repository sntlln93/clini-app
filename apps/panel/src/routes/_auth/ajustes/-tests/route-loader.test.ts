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
const PROFESSIONALS = [OWN_MEMBERSHIP, membership(2, 20)];

// Narrowed from the loader union to a plain callable, since this route always passes a plain async function.
const loader = Route.options.loader as (opts: {
    context: { queryClient: QueryClient };
}) => Promise<{
    canManageProfessionals: boolean;
    professionals: Membership[];
    ownMembership: Membership | null;
}>;

function mockApiGet(session: {
    id: number;
    name: string;
    email: string;
    permissions: string[];
    membership: Membership | null;
}) {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/me') {
            return Promise.resolve({ data: session });
        }
        if (url === '/memberships') {
            return Promise.resolve({ data: { data: PROFESSIONALS } });
        }
        if (url === '/specialties') {
            return Promise.resolve({ data: { data: [] } });
        }
        if (url === '/services') {
            return Promise.resolve({ data: { data: [] } });
        }
        if (url.startsWith('/users/') && url.endsWith('/specialties')) {
            return Promise.resolve({ data: { data: [] } });
        }
        if (
            url.startsWith('/memberships/') &&
            (url.endsWith('/specialties') || url.endsWith('/services'))
        ) {
            return Promise.resolve({ data: { data: [] } });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

describe('/ajustes loader without memberships.view', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGet({
            id: 10,
            name: 'Ana Ejemplo',
            email: 'ana@clini.app',
            permissions: [],
            membership: OWN_MEMBERSHIP,
        });
    });

    it("resolves instead of falling to the error component, never requests /memberships, and degrades to the caller's own membership", async () => {
        const queryClient = new QueryClient();

        const result = await loader({ context: { queryClient } });

        expect(
            vi
                .mocked(api.get)
                .mock.calls.some(([url]) => url === '/memberships'),
        ).toBe(false);
        expect(result).toMatchObject({
            canManageProfessionals: false,
            professionals: [],
            ownMembership: OWN_MEMBERSHIP,
        });
    });
});

describe('/ajustes loader with memberships.view', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGet({
            id: 10,
            name: 'Ana Ejemplo',
            email: 'ana@clini.app',
            permissions: ['memberships.view'],
            membership: OWN_MEMBERSHIP,
        });
    });

    it('requests /memberships and returns the full professionals list', async () => {
        const queryClient = new QueryClient();

        const result = await loader({ context: { queryClient } });

        expect(api.get).toHaveBeenCalledWith('/memberships');
        expect(result).toMatchObject({
            canManageProfessionals: true,
            professionals: PROFESSIONALS,
        });
    });
});
