import { api } from '@/lib/api';
import { buildInvoice } from '@/tests/fixtures/invoice';
import { buildPlan } from '@/tests/fixtures/plan';
import type { Membership } from '@/types/membership';
import type { Subscription } from '@/types/subscription';
import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as ProfesionalesRoute } from '../profesionales';
import { Route as ProteccionDeDatosRoute } from '../proteccion-de-datos';
import { Route as ReservasRoute } from '../reservas';
import { Route as SuscripcionRoute } from '../suscripcion';

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

// Each tab's loader, narrowed from the loader union to the plain async
// function every one of them passes.
function loaderOf<T>(route: { options: { loader?: unknown } }) {
    const loader = route.options.loader as (opts: {
        context: { queryClient: QueryClient };
    }) => Promise<T>;

    return () => loader({ context: { queryClient: new QueryClient() } });
}

const loadSubscription = loaderOf<{
    subscription: Subscription | null;
    isOwner: boolean;
}>(SuscripcionRoute);
const loadBookings = loaderOf<{
    organizationSlug: string | null;
    ownProfessionalMembership: Membership | null;
    organizationSettings: unknown;
}>(ReservasRoute);
const loadProfessionals = loaderOf<{ professionals: Membership[] }>(
    ProfesionalesRoute,
);
const loadDataProtection = loaderOf<{
    isProfessional: boolean;
    isOwner: boolean;
}>(ProteccionDeDatosRoute);

async function expectRedirectToSettings(load: () => Promise<unknown>) {
    const thrown = await load().then(
        () => null,
        (error: unknown) => error,
    );

    expect(isRedirect(thrown)).toBe(true);
    expect((thrown as { options: { to: string } }).options.to).toBe('/ajustes');
}

const ANA = {
    id: 10,
    name: 'Ana Ejemplo',
    email: 'ana@clini.app',
    permissions: [] as string[],
    membership: OWN_MEMBERSHIP as Membership | null,
};

const LOGO = { logo_url: 'http://localhost:8080/api/v1/booking/x/logo?v=1' };

const PLAN = buildPlan('practice');
const INVOICES = [buildInvoice()];

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
        two_factor_enabled?: boolean;
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
        if (url === '/subscription/invoices') {
            return Promise.resolve({ data: { data: INVOICES } });
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
        if (url === '/services') {
            return Promise.resolve({ data: { data: [] } });
        }
        if (
            url.startsWith('/memberships/') &&
            (url.endsWith('/specialties') ||
                url.endsWith('/backed-specialties') ||
                url.endsWith('/services'))
        ) {
            return Promise.resolve({ data: { data: [] } });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

describe('Profesionales tab', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('sends a caller without memberships.view back to Ajustes, never requesting /memberships', async () => {
        mockApiGet(ANA);

        await expectRedirectToSettings(loadProfessionals);
        expect(api.get).not.toHaveBeenCalledWith('/memberships');
    });

    it('requests /memberships with memberships.view and returns the full professionals list', async () => {
        mockApiGet({ ...ANA, permissions: ['memberships.view'] });

        const result = await loadProfessionals();

        expect(api.get).toHaveBeenCalledWith('/memberships');
        expect(result.professionals).toEqual(PROFESSIONALS);
        // What each one's licenses back, the only specialties to choose from (#387).
        expect(api.get).toHaveBeenCalledWith(
            '/memberships/1/backed-specialties',
        );
        expect(api.get).toHaveBeenCalledWith(
            '/memberships/2/backed-specialties',
        );
        expect(api.get).not.toHaveBeenCalledWith('/specialties');
    });
});

describe('Plan y suscripción tab', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('returns the subscription, the plan, its invoices and whether the caller is the owner', async () => {
        mockApiGet({ ...ANA, roles: ['owner'] }, GRACE_SUBSCRIPTION);

        expect(await loadSubscription()).toMatchObject({
            subscription: GRACE_SUBSCRIPTION,
            plan: PLAN,
            invoices: INVOICES,
            isOwner: true,
        });
    });

    // The invoices are the owner's alone (#246): the API refuses anyone else.
    it('never requests the invoices for a member who is not the owner', async () => {
        mockApiGet({ ...ANA, roles: ['admin'] }, GRACE_SUBSCRIPTION);

        expect(await loadSubscription()).toMatchObject({
            invoices: [],
            isOwner: false,
        });
        expect(api.get).not.toHaveBeenCalledWith('/subscription/invoices');
    });

    it('sends a caller without an active membership back to Ajustes, never requesting /subscription', async () => {
        mockApiGet({ ...ANA, membership: null });

        await expectRedirectToSettings(loadSubscription);
        expect(api.get).not.toHaveBeenCalledWith('/subscription');
        expect(api.get).not.toHaveBeenCalledWith('/plan');
    });
});

describe('Reservas tab (#239, #283, #291)', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('loads the logo and the insurance providers with organization.manage', async () => {
        mockApiGet({ ...ANA, permissions: ['organization.manage'] });

        const result = await loadBookings();

        expect(api.get).toHaveBeenCalledWith('/organization/logo');
        expect(result.organizationSettings).toEqual({
            organizationLogo: LOGO,
            insuranceProviders: { catalog: CATALOG, accepted: [CATALOG[0]] },
        });
    });

    it('never requests the logo or the accepted insurance providers without organization.manage', async () => {
        mockApiGet(ANA);

        const result = await loadBookings();

        expect(api.get).not.toHaveBeenCalledWith('/organization/logo');
        expect(api.get).not.toHaveBeenCalledWith(
            '/organization/insurance-providers',
        );
        expect(result.organizationSettings).toBeNull();
    });

    it("never offers a public link of their own to an owner who doesn't attend patients, and always returns the practice's slug", async () => {
        mockApiGet({
            ...ANA,
            roles: ['owner'],
            organization: {
                id: 1,
                name: 'Clínica Modelo',
                slug: 'clinica-modelo',
            },
            membership: { ...OWN_MEMBERSHIP, roles: ['owner'] },
        });

        expect(await loadBookings()).toMatchObject({
            ownProfessionalMembership: null,
            organizationSlug: 'clinica-modelo',
        });
    });

    it('offers it to a professional', async () => {
        mockApiGet({
            ...ANA,
            roles: ['owner', 'professional'],
            organization: {
                id: 1,
                name: 'Clínica Modelo',
                slug: 'clinica-modelo',
            },
            membership: { ...OWN_MEMBERSHIP, roles: ['owner', 'professional'] },
        });

        expect((await loadBookings()).ownProfessionalMembership?.id).toBe(
            OWN_MEMBERSHIP.id,
        );
    });

    it('sends a caller without an active membership back to Ajustes', async () => {
        mockApiGet({ ...ANA, organization: null, membership: null });

        await expectRedirectToSettings(loadBookings);
    });
});

describe('Protección de datos tab', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('shows the export to a professional and the exceptional accesses to the owner', async () => {
        mockApiGet({
            ...ANA,
            roles: ['owner', 'professional'],
            two_factor_enabled: true,
        });

        expect(await loadDataProtection()).toEqual({
            isProfessional: true,
            isOwner: true,
            twoFactorEnabled: true,
        });
    });

    it('shows neither to a member who is neither', async () => {
        mockApiGet({
            ...ANA,
            roles: ['staff'],
            membership: { ...OWN_MEMBERSHIP, roles: ['staff'] },
            two_factor_enabled: false,
        });

        expect(await loadDataProtection()).toEqual({
            isProfessional: false,
            isOwner: false,
            twoFactorEnabled: false,
        });
    });
});
