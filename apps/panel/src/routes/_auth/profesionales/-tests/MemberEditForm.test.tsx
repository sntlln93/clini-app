import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemberEditForm } from '../-components/MemberEditForm';

vi.mock('@/lib/api', () => ({
    api: { patch: vi.fn(), delete: vi.fn() },
}));

const MEMBERSHIP: Membership = {
    id: 5,
    user: { id: 1, name: 'Ana Gomez', email: 'ana@clini.app' },
    roles: ['owner', 'professional'],
    status: 'active',
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

function serverError() {
    return { isAxiosError: true, response: { status: 500, data: {} } };
}

function renderMemberEditForm(membership: Membership = MEMBERSHIP) {
    const queryClient = new QueryClient();
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const editarRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/profesionales/$id/editar',
        component: () => <MemberEditForm membership={membership} />,
    });
    const profesionalesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/profesionales',
        component: () => <div>Profesionales</div>,
    });
    const routeTree = rootRoute.addChildren([editarRoute, profesionalesRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({
            initialEntries: ['/profesionales/5/editar'],
        }),
    });
    render(<RouterProvider router={router} />);
}

describe('MemberEditForm', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('prefills roles and status from the membership prop', async () => {
        renderMemberEditForm();
        await screen.findByRole('button', { name: 'Guardar cambios' });

        expect(
            screen
                .getByRole('checkbox', { name: 'Propietario' })
                .getAttribute('aria-checked'),
        ).toBe('true');
        expect(
            screen
                .getByRole('checkbox', { name: 'Profesional' })
                .getAttribute('aria-checked'),
        ).toBe('true');
        expect(
            screen
                .getByRole('checkbox', { name: 'Administrador' })
                .getAttribute('aria-checked'),
        ).toBe('false');
        expect(
            screen
                .getByRole('checkbox', { name: 'Personal' })
                .getAttribute('aria-checked'),
        ).toBe('false');

        expect(
            screen
                .getByRole('radio', { name: 'Activo' })
                .getAttribute('aria-checked'),
        ).toBe('true');
    });

    it('renders Estado as a radio group and submits a newly picked status', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({
            data: { data: { ...MEMBERSHIP, status: 'suspended' } },
        });
        renderMemberEditForm();
        await screen.findByRole('button', { name: 'Guardar cambios' });

        expect(screen.getByRole('radiogroup')).not.toBeNull();
        const suspendedRadio = screen.getByRole('radio', {
            name: 'Suspendido',
        });
        expect(suspendedRadio.getAttribute('aria-checked')).toBe('false');

        fireEvent.click(suspendedRadio);
        expect(suspendedRadio.getAttribute('aria-checked')).toBe('true');

        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/memberships/5', {
                roles: ['owner', 'professional'],
                status: 'suspended',
            }),
        );
    });

    it('keeps roles as a multi-select: several roles stay checked at the same time', async () => {
        renderMemberEditForm();
        await screen.findByRole('button', { name: 'Guardar cambios' });

        fireEvent.click(screen.getByRole('checkbox', { name: 'Administrador' }));

        for (const role of ['Propietario', 'Profesional', 'Administrador']) {
            expect(
                screen
                    .getByRole('checkbox', { name: role })
                    .getAttribute('aria-checked'),
            ).toBe('true');
        }
    });

    it('updates against the membership id with the current payload and navigates on success', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({
            data: { data: MEMBERSHIP },
        });
        renderMemberEditForm();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Guardar cambios' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/memberships/5', {
                roles: ['owner', 'professional'],
                status: 'active',
            }),
        );
        await screen.findByText('Profesionales');
    });

    it('excludes an unchecked role from the submitted payload', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({
            data: { data: MEMBERSHIP },
        });
        renderMemberEditForm();

        fireEvent.click(
            await screen.findByRole('checkbox', { name: 'Propietario' }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/memberships/5', {
                roles: ['professional'],
                status: 'active',
            }),
        );
    });

    it('does not send a deactivation request when the confirm dialog is cancelled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        renderMemberEditForm();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Dar de baja' }),
        );

        expect(api.delete).not.toHaveBeenCalled();
    });

    it('deactivates the membership and navigates on confirm', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        renderMemberEditForm();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Dar de baja' }),
        );

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith('/memberships/5'),
        );
        await screen.findByText('Profesionales');
    });

    it('shows a mutation error message at the top of the form', async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(serverError());
        renderMemberEditForm();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Guardar cambios' }),
        );

        await screen.findByText(
            'Ocurrió un error inesperado. Intentá nuevamente.',
        );
    });
});
