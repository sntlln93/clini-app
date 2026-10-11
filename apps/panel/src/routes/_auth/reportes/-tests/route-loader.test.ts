import { api } from '@/lib/api';
import { buildPlan } from '@/tests/fixtures/plan';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route } from '../index';
import { buildReport } from './fixtures';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

// `loader`'s type also allows a non-callable pre-built shape; narrow it back to the plain function this route always passes.
const loader = Route.options.loader as (opts: {
    context: { queryClient: QueryClient };
    deps: Record<string, unknown>;
}) => Promise<unknown>;

const ROSTER = [
    { id: 5, user: { id: 50, name: 'Ana Pérez', email: 'ana@test.com' } },
    { id: 6, user: { id: 60, name: 'Bruno Díaz', email: 'bruno@test.com' } },
];
const REPORT = buildReport();

let plan = buildPlan('center');
let session: Record<string, unknown> = {};

function owner() {
    return {
        id: 1,
        name: 'Dueña',
        email: 'duena@test.com',
        permissions: ['appointments.view', 'reports.view'],
        membership: { id: 1, user: { id: 1 }, roles: ['owner'] },
    };
}

function professional(
    permissions = ['appointments.view.own', 'reports.view.own'],
) {
    return {
        id: 50,
        name: 'Ana Pérez',
        email: 'ana@test.com',
        permissions,
        membership: { id: 5, user: { id: 50 }, roles: ['professional'] },
    };
}

function runLoader(deps: Record<string, unknown> = {}) {
    return loader({ context: { queryClient: new QueryClient() }, deps });
}

describe('/reportes loader', () => {
    beforeEach(() => {
        plan = buildPlan('center');
        session = owner();
        vi.mocked(api.get).mockReset();
        vi.mocked(api.get).mockImplementation((url: string) => {
            const responses: Record<string, unknown> = {
                '/me': { data: session },
                '/plan': { data: { data: plan } },
                '/professionals': { data: { data: ROSTER } },
                '/reports': { data: { data: REPORT } },
            };

            return url in responses
                ? Promise.resolve(responses[url])
                : Promise.reject(new Error(`unexpected GET ${url}`));
        });
    });

    it.each([['free'], ['practice']] as const)(
        'never requests the report on %s, which does not include it',
        async (planId) => {
            plan = buildPlan(planId);

            expect(await runLoader()).toEqual({ available: false });
            expect(api.get).not.toHaveBeenCalledWith(
                '/reports',
                expect.anything(),
            );
        },
    );

    it('requests the whole organization for reports.view, with the roster to narrow by', async () => {
        const result = await runLoader({
            from: '2026-09-07',
            granularity: 'week',
        });

        expect(api.get).toHaveBeenCalledWith('/reports', {
            params: {
                from: '2026-09-07',
                to: undefined,
                granularity: 'week',
                membership_id: undefined,
            },
        });
        expect(result).toEqual({
            available: true,
            report: REPORT,
            professionals: ROSTER,
            membershipId: undefined,
        });
    });

    it('narrows to a professional of the roster, and ignores an id outside it', async () => {
        await runLoader({ membershipId: 6 });
        expect(api.get).toHaveBeenLastCalledWith('/reports', {
            params: expect.objectContaining({ membership_id: 6 }),
        });

        await runLoader({ membershipId: 99 });
        expect(api.get).toHaveBeenLastCalledWith('/reports', {
            params: expect.objectContaining({ membership_id: undefined }),
        });
    });

    it('always requests their own report for a professional, whatever the URL says', async () => {
        session = professional();

        const result = await runLoader({ membershipId: 6 });

        expect(api.get).toHaveBeenCalledWith('/reports', {
            params: expect.objectContaining({ membership_id: 5 }),
        });
        expect(api.get).not.toHaveBeenCalledWith('/professionals');
        expect(result).toEqual(
            expect.objectContaining({ professionals: [], membershipId: 5 }),
        );
    });

    it('lets a session without any reports permission get the API answer, not a guessed membership', async () => {
        session = professional(['appointments.view']);

        await runLoader();

        expect(api.get).toHaveBeenCalledWith('/reports', {
            params: expect.objectContaining({ membership_id: undefined }),
        });
    });
});
