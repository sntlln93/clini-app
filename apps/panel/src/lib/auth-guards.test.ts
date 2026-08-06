import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { redirectIfAuthenticated, requireSession } from './auth-guards';
import { queryClient as sharedQueryClient } from './query-client';
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

// A bare `new QueryClient()` (as used above) has no `onError` sink, so a
// `console.error` spy against it would pass vacuously. These cases run
// against the real `queryClient` (the one carrying `QueryCache.onError`,
// see `query-client.ts`) to prove the expected-401 probe stays silent.
describe('guards against the app queryClient (console.error sink)', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        sharedQueryClient.clear();
        consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('requireSession still redirects to /login on a 401, without logging', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(unauthorized);

        await expect(
            requireSession({ queryClient: sharedQueryClient }),
        ).rejects.toMatchObject({
            options: { to: '/login' },
        });
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('redirectIfAuthenticated still resolves on a 401, without logging', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(unauthorized);

        await expect(
            redirectIfAuthenticated({ queryClient: sharedQueryClient }),
        ).resolves.toBeUndefined();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
