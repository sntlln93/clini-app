import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import type { ProfessionalLicense } from '@/types/professional-license';
import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as ConsultorioRoute } from '../consultorio';
import { Route as MatriculasRoute } from '../matriculas';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

function membership(roles: string[]): Membership {
    return {
        id: 1,
        user: { id: 10, name: 'Ana Ejemplo', email: 'ana@clini.app' },
        roles,
        status: 'active',
        slug: null,
        deleted_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
    } as Membership;
}

const ORGANIZATION = {
    id: 1,
    name: 'Consultorio',
    slug: 'consultorio',
    timezone: 'America/Argentina/Buenos_Aires',
    province: 'cordoba',
};

const LICENSES: ProfessionalLicense[] = [
    {
        id: 1,
        number: 'MP 6789',
        province: 'cordoba',
        profession: 'medico',
        status: 'verified',
        mismatch_reason: null,
        refeps_code: '541030123456',
        issuer: null,
        specialty: null,
        situation: 'Habilitado',
        checked_at: '2026-11-01T12:00:00Z',
        added: true,
    },
];

const DOCUMENT = {
    document_number: '30123456',
    locked: true,
    registry: 'found',
};

function mockApiGet(session: {
    permissions: string[];
    membership: Membership | null;
    organization: typeof ORGANIZATION | null;
}) {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/me') {
            return Promise.resolve({
                data: {
                    id: 10,
                    name: 'Ana',
                    email: 'ana@clini.app',
                    ...session,
                },
            });
        }
        if (url === '/me/licenses') {
            return Promise.resolve({ data: { data: LICENSES } });
        }
        if (url === '/me/professional-document') {
            return Promise.resolve({
                data: { data: DOCUMENT },
            });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

function loaderOf<T>(route: { options: { loader?: unknown } }) {
    const loader = route.options.loader as (opts: {
        context: { queryClient: QueryClient };
    }) => Promise<T>;

    return () => loader({ context: { queryClient: new QueryClient() } });
}

async function expectRedirectToSettings(load: () => Promise<unknown>) {
    const thrown = await load().then(
        () => null,
        (error: unknown) => error,
    );

    expect(isRedirect(thrown)).toBe(true);
    expect((thrown as { options: { to: string } }).options.to).toBe('/ajustes');
}

const loadLicenses = loaderOf(MatriculasRoute);
const loadPractice = loaderOf(ConsultorioRoute);

describe('Matrículas tab', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('returns the DNI, the licenses and the practice province to a professional', async () => {
        mockApiGet({
            permissions: [],
            membership: membership(['professional']),
            organization: ORGANIZATION,
        });

        expect(await loadLicenses()).toEqual({
            isProfessional: true,
            managedOwnMembership: null,
            document: DOCUMENT,
            licenses: LICENSES,
            organizationProvince: 'cordoba',
        });
    });

    // The «Atiendo pacientes» switch lives here since #387 (#286).
    it('hands whoever manages the team their own membership, professional or not, and reads no DNI unless they attend', async () => {
        const owner = membership(['owner']);
        mockApiGet({
            permissions: ['memberships.manage'],
            membership: owner,
            organization: ORGANIZATION,
        });

        expect(await loadLicenses()).toEqual({
            isProfessional: false,
            managedOwnMembership: owner,
            document: null,
            licenses: [],
            organizationProvince: 'cordoba',
        });
        expect(api.get).not.toHaveBeenCalledWith('/me/professional-document');
        expect(api.get).not.toHaveBeenCalledWith('/me/licenses');
    });

    it('sends whoever neither attends patients nor can turn it on back to Ajustes, never reading the DNI', async () => {
        mockApiGet({
            permissions: [],
            membership: membership(['staff']),
            organization: ORGANIZATION,
        });

        await expectRedirectToSettings(loadLicenses);
        expect(api.get).not.toHaveBeenCalledWith('/me/professional-document');
    });
});

describe('Consultorio tab', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('returns the practice province to whoever manages the organization', async () => {
        mockApiGet({
            permissions: ['organization.manage'],
            membership: membership(['owner']),
            organization: ORGANIZATION,
        });

        expect(await loadPractice()).toEqual({ province: 'cordoba' });
    });

    it('sends anyone else back to Ajustes', async () => {
        mockApiGet({
            permissions: [],
            membership: membership(['professional']),
            organization: ORGANIZATION,
        });

        await expectRedirectToSettings(loadPractice);
    });
});
