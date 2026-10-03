import { api } from '@/lib/api';
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

describe('/sala-de-espera loader', () => {
    beforeEach(() => {
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
            if (url === '/appointments') {
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

        expect(api.get).toHaveBeenCalledWith('/appointments', {
            params: {
                from: new Date(2026, 7, 3, 0, 0, 0, 0).toISOString(),
                to: new Date(2026, 7, 3, 23, 59, 59, 999).toISOString(),
                status: 'arrived',
            },
        });
        expect(result).toEqual({ professionals: ROSTER, appointments: [] });
    });
});
