import type { PlatformAdmin } from '@/types/admin';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { redirectIfAuthenticated, requireSession } from './auth-guards';
import { queryClient as sharedQueryClient } from './query-client';
import { adminSessionQueryOptions } from './session';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const admin: PlatformAdmin = {
    id: 1,
    name: 'Olivia Operadora',
    email: 'operador@test.com',
    last_login_at: null,
};
const unauthorized = { isAxiosError: true, response: { status: 401 } };

describe('requireSession', () => {
    it('resolves without throwing when GET /admin/me returns an operator, and caches it (unwrapped)', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: { data: admin } });
        const queryClient = new QueryClient();

        await expect(requireSession({ queryClient })).resolves.toBeUndefined();

        expect(api.get).toHaveBeenCalledWith('/admin/me');
        expect(
            queryClient.getQueryData(adminSessionQueryOptions.queryKey),
        ).toEqual(admin);
    });

    it('throws a redirect to /login when GET /admin/me rejects with 401', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(unauthorized);
        const queryClient = new QueryClient();

        await expect(requireSession({ queryClient })).rejects.toMatchObject({
            options: { to: '/login' },
        });
    });

    it('keeps the requested page, search included, as the login redirect', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(unauthorized);
        const queryClient = new QueryClient();

        await expect(
            requireSession({
                queryClient,
                location: { href: '/organizaciones/12?q=norte' },
            }),
        ).rejects.toMatchObject({
            options: {
                to: '/login',
                search: { redirect: '/organizaciones/12?q=norte' },
            },
        });
    });

    it.each(['/'])(
        'leaves the redirect out for the default destination %s',
        async (href) => {
            vi.mocked(api.get).mockRejectedValueOnce(unauthorized);
            const queryClient = new QueryClient();

            await expect(
                requireSession({ queryClient, location: { href } }),
            ).rejects.toMatchObject({ options: { to: '/login', search: {} } });
        },
    );
});

describe('redirectIfAuthenticated', () => {
    it('throws a redirect to / when GET /admin/me returns a user', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: { data: admin } });
        const queryClient = new QueryClient();

        await expect(
            redirectIfAuthenticated({ queryClient }),
        ).rejects.toMatchObject({
            options: { to: '/' },
        });
    });

    it('sends an authenticated visitor to a safe ?redirect= target instead', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: { data: admin } });
        const queryClient = new QueryClient();

        await expect(
            redirectIfAuthenticated({
                queryClient,
                location: {
                    href: '/login?redirect=%2Fusuarios%2F12',
                    search: { redirect: '/usuarios/12' },
                },
            }),
        ).rejects.toMatchObject({ options: { href: '/usuarios/12' } });
    });

    it('ignores an unsafe ?redirect= target and falls back to /', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: { data: admin } });
        const queryClient = new QueryClient();

        await expect(
            redirectIfAuthenticated({
                queryClient,
                location: {
                    href: '/login',
                    search: { redirect: '//evil.com' },
                },
            }),
        ).rejects.toMatchObject({ options: { to: '/' } });
    });

    it('returns without throwing when GET /admin/me rejects with 401', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(unauthorized);
        const queryClient = new QueryClient();

        await expect(
            redirectIfAuthenticated({ queryClient }),
        ).resolves.toBeUndefined();
    });
});

// A bare `new QueryClient()` has no `onError` sink (would pass vacuously); these cases use the real `queryClient` instead.
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
