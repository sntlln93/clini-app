import { api, refreshCsrfCookie } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyEmailCard } from '../-components/VerifyEmailCard';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
    refreshCsrfCookie: vi.fn(),
}));

const TOKEN = 'abc123';

function verificationDomainError() {
    return {
        isAxiosError: true,
        response: {
            status: 404,
            data: {
                error: {
                    code: 'auth.email_verification_invalid_or_expired',
                    message:
                        'The email verification link is invalid or has expired.',
                    context: {},
                },
            },
        },
    };
}

function renderVerifyEmailCard() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const verifyRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/verificar-email/$token',
        component: () => <VerifyEmailCard token={TOKEN} />,
    });
    const agendaRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/agenda',
        component: () => <div>Agenda</div>,
    });
    const routeTree = rootRoute.addChildren([verifyRoute, agendaRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({
            initialEntries: [`/verificar-email/${TOKEN}`],
        }),
    });
    render(<RouterProvider router={router} />);
}

describe('VerifyEmailCard', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
        vi.mocked(refreshCsrfCookie)
            .mockReset()
            .mockResolvedValue(undefined as never);
    });

    it('renders the skeleton and no confirm button while the validity query is pending', async () => {
        vi.mocked(api.get).mockReturnValueOnce(new Promise(() => {}));
        renderVerifyEmailCard();

        expect(await screen.findByRole('status')).not.toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('renders the email and a confirm button on a valid token, without firing a POST on render', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: { email: 'ana@clini.app' },
        });
        renderVerifyEmailCard();

        await screen.findByText('ana@clini.app', { exact: false });
        expect(
            screen.getByRole('button', { name: 'Confirmar correo' }),
        ).not.toBeNull();

        expect(api.post).not.toHaveBeenCalled();
    });

    it('fires the POST to confirm the token when the confirm button is clicked', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: { email: 'ana@clini.app' },
        });
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { message: 'Correo confirmado.' },
        });
        renderVerifyEmailCard();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Confirmar correo' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                `/email-verification/${TOKEN}`,
            ),
        );
    });

    it('renders the generic Spanish message and no confirm button when the validity query fails', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(verificationDomainError());
        renderVerifyEmailCard();

        await screen.findByText(
            'El enlace de verificación no es válido o ya venció.',
        );
        expect(screen.queryByRole('button')).toBeNull();
    });
});
