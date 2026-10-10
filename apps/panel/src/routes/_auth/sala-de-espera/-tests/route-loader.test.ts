import { api } from '@/lib/api';
import { buildPlan } from '@/tests/fixtures/plan';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route } from '../index';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

// `loader`'s type also allows a non-callable pre-built shape; narrow it back to the plain function this route always passes.
const loader = Route.options.loader as (opts: {
    context: { queryClient: QueryClient };
}) => Promise<unknown>;

const ROSTER = [
    { id: 5, user: { id: 50, name: 'Dra. Uno', email: 'uno@test.com' } },
];

let plan = buildPlan('practice');

describe('/sala-de-espera loader', () => {
    beforeEach(() => {
        plan = buildPlan('practice');
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 7, 3, 15, 30));
        vi.mocked(api.get).mockReset();
        vi.mocked(api.get).mockImplementation((url: string) => {
            if (url === '/me') {
                return Promise.resolve({
                    data: {
                        id: 1,
                        name: 'Ana',
                        email: 'ana@clini.app',
                        permissions: ['appointments.view'],
                    },
                });
            }
            if (url === '/professionals') {
                return Promise.resolve({ data: { data: ROSTER } });
            }
            if (url === '/plan') {
                return Promise.resolve({ data: { data: plan } });
            }
            if (url === '/waiting-room') {
                return Promise.resolve({ data: { data: [] } });
            }
            return Promise.reject(new Error(`unexpected GET ${url}`));
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("requests today's arrived appointments and the scoped roster", async () => {
        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(api.get).toHaveBeenCalledWith('/waiting-room', {
            params: {
                from: new Date(2026, 7, 3, 0, 0, 0, 0).toISOString(),
                to: new Date(2026, 7, 3, 23, 59, 59, 999).toISOString(),
            },
        });
        expect(result).toEqual({
            available: true,
            professionals: ROSTER,
            appointments: [],
            updatedAt: new Date(2026, 7, 3, 15, 30).getTime(),
        });
    });

    it('never requests the waiting room on a plan without it (#237)', async () => {
        plan = buildPlan('free');

        const result = await loader({
            context: { queryClient: new QueryClient() },
        });

        expect(result).toEqual({ available: false });
        expect(api.get).not.toHaveBeenCalledWith(
            '/waiting-room',
            expect.anything(),
        );
    });
});
