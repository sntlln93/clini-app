import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { redirectIfAuthenticated, requireSession } from './auth-guards';
import { sessionQueryOptions, type SessionUser } from './session';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const user: SessionUser = {
    id: 1,
    name: 'Ana Ejemplo',
    email: 'ana@clini.app',
};
const unauthorized = { isAxiosError: true, response: { status: 401 } };

describe('requireSession', () => {
    it('resolves without throwing when GET /me returns a user, and caches it', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: user });
        const queryClient = new QueryClient();

        await expect(requireSession({ queryClient })).resolves.toBeUndefined();

        expect(api.get).toHaveBeenCalledWith('/me');
        expect(queryClient.getQueryData(sessionQueryOptions.queryKey)).toEqual(
            user,
        );
    });

    it('throws a redirect to /login when GET /me rejects with 401', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(unauthorized);
        const queryClient = new QueryClient();

        await expect(requireSession({ queryClient })).rejects.toMatchObject({
            options: { to: '/login' },
        });
    });
});

describe('redirectIfAuthenticated', () => {
    it('throws a redirect to /agenda when GET /me returns a user', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: user });
        const queryClient = new QueryClient();

        await expect(
            redirectIfAuthenticated({ queryClient }),
        ).rejects.toMatchObject({
            options: { to: '/agenda' },
        });
    });

    it('returns without throwing when GET /me rejects with 401', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(unauthorized);
        const queryClient = new QueryClient();

        await expect(
            redirectIfAuthenticated({ queryClient }),
        ).resolves.toBeUndefined();
    });
});
