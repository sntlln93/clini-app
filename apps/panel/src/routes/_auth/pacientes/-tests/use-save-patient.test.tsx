import { api } from '@/lib/api';
import type { PatientPayload } from '@/types/patient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSavePatient } from '../-hooks/use-save-patient';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({ notifySuccess: vi.fn() }));

function SaveButton() {
    const { mutate } = useSavePatient(12);
    return (
        <button
            type="button"
            onClick={() => mutate({ name: 'Juan Pérez' } as PatientPayload)}
        >
            Guardar
        </button>
    );
}

function renderSaveButton() {
    const queryClient = new QueryClient();
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const editRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes/$id/editar',
        component: SaveButton,
    });
    const detailRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes/$id',
        component: () => <div>Ficha</div>,
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([editRoute, detailRoute]),
        history: createMemoryHistory({
            initialEntries: ['/pacientes/12/editar'],
        }),
    });
    render(<RouterProvider router={router} />);

    return { queryClient };
}

describe('useSavePatient', () => {
    it('drops the cached list pages so the list refetches after a save, keeping other patient queries', async () => {
        vi.mocked(api.put).mockResolvedValueOnce({
            data: { data: { id: 12, name: 'Juan Pérez' } },
        });
        const { queryClient } = renderSaveButton();
        const listKey = ['patients', { q: '', page: 1 }];
        const lookupKey = ['patients', 'lookup', 'dni', '30111222'];
        queryClient.setQueryData(listKey, { data: [{ name: 'Juan Perez' }] });
        queryClient.setQueryData(lookupKey, null);

        fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }));

        await screen.findByText('Ficha');
        expect(queryClient.getQueryData(listKey)).toBeUndefined();
        expect(queryClient.getQueryState(lookupKey)).toBeDefined();
    });
});
