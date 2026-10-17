import { api } from '@/lib/api';
import { buildPlan } from '@/tests/fixtures/plan';
import type { Membership } from '@/types/membership';
import type { Plan } from '@/types/plan';
import type { Subscription } from '@/types/subscription';
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
    ownProfessionalMembership: Membership | null;
    managedOwnMembership: Membership | null;
    organizationSlug: string | null;
    hasOrganization: boolean;
    subscription: Subscription | null;
    plan: Plan | undefined;
    isOwner: boolean;
    organizationSettings: {
        organizationLogo: { logo_url: string | null };
        insuranceProviders: {
            catalog: { id: number; name: string }[];
            accepted: { id: number; name: string }[];
        };
    } | null;
}>;

const LOGO = { logo_url: 'http://localhost:8080/api/v1/booking/x/logo?v=1' };

const PLAN = buildPlan('practice');

const CATALOG = [
    { id: 1, name: 'OSDE' },
    { id: 2, name: 'Galeno' },
];

const GRACE_SUBSCRIPTION: Subscription = {
    status: 'grace',
    restricted: false,
    grace_ends_at: '2026-10-10T12:00:00+00:00',
    grace_days_left: 7,
    last_payment_at: null,
    last_payment_failed_at: '2026-10-03T12:00:00+00:00',
    next_payment_at: null,
    cancelled_at: null,
    access_ends_at: null,
    billing: 'monthly',
    amount: null,
};

function mockApiGet(
    session: {
        id: number;
        name: string;
        email: string;
        permissions: string[];
        roles?: string[];
        organization?: { id: number; name: string; slug: string } | null;
        membership: Membership | null;
    },
    subscription: Subscription | null = null,
) {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/me') {
            return Promise.resolve({ data: session });
        }
        if (url === '/subscription') {
            return Promise.resolve({ data: { data: subscription } });
        }
        if (url === '/organization/logo') {
            return Promise.resolve({ data: { data: LOGO } });
        }
        if (url === '/insurance-providers') {
            return Promise.resolve({ data: { data: CATALOG } });
        }
        if (url === '/organization/insurance-providers') {
            return Promise.resolve({ data: { data: [CATALOG[0]] } });
        }
        if (url === '/plan') {
            return Promise.resolve({ data: { data: PLAN } });
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
            ownProfessionalMembership: OWN_MEMBERSHIP,
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

describe('/ajustes loader subscription', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('returns the subscription, the plan and whether the caller is the owner', async () => {
        mockApiGet(
            {
                id: 10,
                name: 'Ana Ejemplo',
                email: 'ana@clini.app',
                permissions: [],
                roles: ['owner'],
                membership: OWN_MEMBERSHIP,
            },
            GRACE_SUBSCRIPTION,
        );

        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(result).toMatchObject({
            hasOrganization: true,
            subscription: GRACE_SUBSCRIPTION,
            plan: PLAN,
            isOwner: true,
        });
    });

    it('never requests /subscription without an active membership', async () => {
        mockApiGet({
            id: 10,
            name: 'Ana Ejemplo',
            email: 'ana@clini.app',
            permissions: [],
            membership: null,
        });

        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(api.get).not.toHaveBeenCalledWith('/subscription');
        expect(api.get).not.toHaveBeenCalledWith('/plan');
        expect(result).toMatchObject({
            hasOrganization: false,
            subscription: null,
            isOwner: false,
        });
    });
});

describe('/ajustes loader organization settings (#239, #291)', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('loads the logo and the insurance providers with organization.manage', async () => {
        mockApiGet({
            id: 10,
            name: 'Ana Ejemplo',
            email: 'ana@clini.app',
            permissions: ['organization.manage'],
            membership: OWN_MEMBERSHIP,
        });

        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(api.get).toHaveBeenCalledWith('/organization/logo');
        expect(result.organizationSettings).toEqual({
            organizationLogo: LOGO,
            insuranceProviders: { catalog: CATALOG, accepted: [CATALOG[0]] },
        });
    });

    it('never requests the logo or the accepted insurance providers without organization.manage', async () => {
        mockApiGet({
            id: 10,
            name: 'Ana Ejemplo',
            email: 'ana@clini.app',
            permissions: [],
            membership: OWN_MEMBERSHIP,
        });

        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(api.get).not.toHaveBeenCalledWith('/organization/logo');
        expect(api.get).not.toHaveBeenCalledWith(
            '/organization/insurance-providers',
        );
        expect(result.organizationSettings).toBeNull();
    });
});

describe('/ajustes loader booking links (#283)', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it("never offers a public link of their own to an owner who doesn't attend patients, and always returns the practice's slug", async () => {
        mockApiGet({
            id: 10,
            name: 'Ana Dueña',
            email: 'ana.duena@test.com',
            permissions: [],
            roles: ['owner'],
            organization: {
                id: 1,
                name: 'Clínica Modelo',
                slug: 'clinica-modelo',
            },
            membership: { ...OWN_MEMBERSHIP, roles: ['owner'] },
        });

        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(result).toMatchObject({
            ownProfessionalMembership: null,
            organizationSlug: 'clinica-modelo',
        });
    });

    it('offers it to a professional', async () => {
        mockApiGet({
            id: 10,
            name: 'Ana Dueña',
            email: 'ana.duena@test.com',
            permissions: [],
            roles: ['owner', 'professional'],
            organization: {
                id: 1,
                name: 'Clínica Modelo',
                slug: 'clinica-modelo',
            },
            membership: { ...OWN_MEMBERSHIP, roles: ['owner', 'professional'] },
        });

        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(result.ownProfessionalMembership?.id).toBe(OWN_MEMBERSHIP.id);
    });

    it('has no practice link without an active membership', async () => {
        mockApiGet({
            id: 10,
            name: 'Ana Ejemplo',
            email: 'ana@clini.app',
            permissions: [],
            organization: null,
            membership: null,
        });

        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(result).toMatchObject({
            ownProfessionalMembership: null,
            organizationSlug: null,
        });
    });
});

describe('/ajustes loader attend-patients switch (#286)', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('hands the caller their own membership when they manage the team, professional or not', async () => {
        const ownerOnly = { ...OWN_MEMBERSHIP, roles: ['owner' as const] };
        mockApiGet({
            id: 10,
            name: 'Ana Dueña',
            email: 'ana.duena@test.com',
            permissions: ['memberships.manage'],
            roles: ['owner'],
            membership: ownerOnly,
        });

        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(result.managedOwnMembership).toEqual(ownerOnly);
    });

    it('leaves it out for anyone who cannot edit memberships', async () => {
        mockApiGet({
            id: 10,
            name: 'Ana Ejemplo',
            email: 'ana@clini.app',
            permissions: [],
            roles: ['professional'],
            membership: OWN_MEMBERSHIP,
        });

        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(result.managedOwnMembership).toBeNull();
    });
});
