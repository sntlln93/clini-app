import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import type { Professional } from '@/types/professional';
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

// Mirrors `membershipToProfessional`'s own-membership degrade path in use-professionals.ts.
const OWN_PROFESSIONAL: Professional = {
    id: OWN_MEMBERSHIP.id,
    user: { id: 10, name: 'User 10', email: '' },
};

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
    professionals: Professional[];
    selectedId: number | undefined;
}>;

describe('/disponibilidad loader without memberships.view', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGetWithoutMembershipsView();
    });

    it("resolves without /memberships or /professionals and defaults the selected membership to the caller's own", async () => {
        const queryClient = new QueryClient();

        const result = await loader({
            context: { queryClient },
            deps: { membershipId: undefined },
        });

        expect(
            vi
                .mocked(api.get)
                .mock.calls.some(
                    ([url]) =>
                        url === '/memberships' || url === '/professionals',
                ),
        ).toBe(false);
        expect(result).toMatchObject({
            professionals: [OWN_PROFESSIONAL],
            selectedId: OWN_PROFESSIONAL.id,
        });
    });
});

const STAFF_MEMBERSHIP: Membership = {
    ...membership(2, 20),
    roles: ['staff'],
};

const STAFF_ROSTER: Professional[] = [
    {
        id: 5,
        user: { id: 50, name: 'Dra. Roster Uno', email: 'roster1@test.com' },
    },
    {
        id: 6,
        user: { id: 60, name: 'Dr. Roster Dos', email: 'roster2@test.com' },
    },
];

function mockApiGetForStaffWithoutMembershipsView() {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/me') {
            return Promise.resolve({
                data: {
                    id: 20,
                    name: 'Elena Staff',
                    email: 'elena.staff@test.com',
                    permissions: ['appointments.view', 'availability.manage'],
                    membership: STAFF_MEMBERSHIP,
                },
            });
        }
        if (url === '/professionals') {
            return Promise.resolve({ data: { data: STAFF_ROSTER } });
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

describe('/disponibilidad loader for a Staff session without memberships.view', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGetForStaffWithoutMembershipsView();
    });

    it('resolves the roster from GET /professionals and gets a populated list', async () => {
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
            professionals: STAFF_ROSTER,
            selectedId: STAFF_ROSTER[0].id,
        });
    });
});
