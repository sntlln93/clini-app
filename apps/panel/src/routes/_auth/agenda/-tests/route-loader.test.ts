import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import type { Professional } from '@/types/professional';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route } from '../index';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

// Mirrors the route's date-range math independently, so the expectation isn't copy-pasted from the loader under test.
function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function startOfWeek(date: Date): Date {
    const result = startOfDay(date);
    result.setDate(result.getDate() - result.getDay());
    return result;
}

function endOfWeek(date: Date): Date {
    return endOfDay(addDays(startOfWeek(date), 6));
}

// `loader`'s type also allows a non-callable pre-built shape; narrow it back to the plain function this route always passes.
const loader = Route.options.loader as (opts: {
    context: { queryClient: QueryClient };
    deps: { date: string; view: 'day' | 'week' };
}) => Promise<unknown>;

const PROFESSIONALS: Membership[] = [];

function mockApiGet() {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/me') {
            return Promise.resolve({
                data: {
                    id: 1,
                    name: 'Ana Ejemplo',
                    email: 'ana@clini.app',
                    permissions: ['memberships.view'],
                },
            });
        }
        if (url === '/memberships') {
            return Promise.resolve({ data: { data: PROFESSIONALS } });
        }
        if (url === '/appointments') {
            return Promise.resolve({ data: { data: [] } });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

describe('/agenda loader date range', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGet();
    });

    it('requests the day range for view: "day"', async () => {
        const queryClient = new QueryClient();
        const date = new Date(2026, 0, 15); // Thursday, Jan 15 2026

        await loader({
            context: { queryClient },
            deps: { date: '2026-01-15', view: 'day' },
        });

        expect(api.get).toHaveBeenCalledWith('/appointments', {
            params: {
                from: startOfDay(date).toISOString(),
                to: endOfDay(date).toISOString(),
                membership_id: undefined,
            },
        });
    });

    it('requests the week range for view: "week"', async () => {
        const queryClient = new QueryClient();
        const date = new Date(2026, 0, 15); // Thursday, Jan 15 2026

        await loader({
            context: { queryClient },
            deps: { date: '2026-01-15', view: 'week' },
        });

        expect(api.get).toHaveBeenCalledWith('/appointments', {
            params: {
                from: startOfWeek(date).toISOString(),
                to: endOfWeek(date).toISOString(),
                membership_id: undefined,
            },
        });
    });
});

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
        if (url === '/appointments') {
            return Promise.resolve({ data: { data: [] } });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

describe('/agenda loader without memberships.view', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGetWithoutMembershipsView();
    });

    it("resolves without /memberships or /professionals and degrades professionals to the caller's own membership", async () => {
        const queryClient = new QueryClient();

        const result = await loader({
            context: { queryClient },
            deps: { date: '2026-01-15', view: 'day' },
        });

        expect(
            vi
                .mocked(api.get)
                .mock.calls.some(
                    ([url]) => url === '/memberships' || url === '/professionals',
                ),
        ).toBe(false);
        expect(result).toMatchObject({ professionals: [OWN_PROFESSIONAL] });
    });
});

const STAFF_MEMBERSHIP: Membership = {
    ...membership(2, 20),
    roles: ['staff'],
};

const STAFF_ROSTER: Professional[] = [
    { id: 5, user: { id: 50, name: 'Dra. Roster Uno', email: 'roster1@test.com' } },
    { id: 6, user: { id: 60, name: 'Dr. Roster Dos', email: 'roster2@test.com' } },
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
        if (url === '/appointments') {
            return Promise.resolve({ data: { data: [] } });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

describe('/agenda loader for a Staff session without memberships.view', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGetForStaffWithoutMembershipsView();
    });

    it('resolves the roster from GET /professionals and gets a populated list', async () => {
        const queryClient = new QueryClient();

        const result = await loader({
            context: { queryClient },
            deps: { date: '2026-01-15', view: 'day' },
        });

        expect(
            vi
                .mocked(api.get)
                .mock.calls.some(([url]) => url === '/memberships'),
        ).toBe(false);
        expect(result).toMatchObject({ professionals: STAFF_ROSTER });
    });
});

function mockApiGetForNoRosterPermissionsAndNonProfessionalOwnMembership() {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/me') {
            return Promise.resolve({
                data: {
                    id: 20,
                    name: 'Elena Staff',
                    email: 'elena.staff@test.com',
                    permissions: [],
                    membership: STAFF_MEMBERSHIP,
                },
            });
        }
        if (url === '/appointments') {
            return Promise.resolve({ data: { data: [] } });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

describe('/agenda loader for a session with none of the roster permissions and a non-professional own membership', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGetForNoRosterPermissionsAndNonProfessionalOwnMembership();
    });

    it('resolves without /memberships or /professionals and degrades professionals to an empty list', async () => {
        const queryClient = new QueryClient();

        const result = await loader({
            context: { queryClient },
            deps: { date: '2026-01-15', view: 'day' },
        });

        expect(
            vi
                .mocked(api.get)
                .mock.calls.some(
                    ([url]) => url === '/memberships' || url === '/professionals',
                ),
        ).toBe(false);
        expect(result).toMatchObject({ professionals: [] });
    });
});
