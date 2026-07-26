import type { Patient } from '@/types/patient';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PatientsTable } from '../-components/PatientsTable';

const PATIENTS: Patient[] = [
    {
        id: 1,
        name: 'Ana Gomez',
        email: null,
        phone: null,
        document_type: 'dni',
        document_number: '12345678',
        sex: null,
        birth_date: null,
        insurance_provider_id: null,
        insurance_provider: null,
        created_at: '2026-01-01T00:00:00Z',
    },
];

function renderPatientsTable(patients: Patient[]) {
    const rootRoute = createRootRoute({ component: () => <Outlet /> });
    const pacientesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes',
        component: () => <PatientsTable patients={patients} />,
    });
    const editarRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes/$id/editar',
        component: () => <div>Editar paciente</div>,
    });
    const routeTree = rootRoute.addChildren([pacientesRoute, editarRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/pacientes'] }),
    });
    return render(<RouterProvider router={router} />);
}

describe('PatientsTable', () => {
    it('renders one row per patient with name, document and an Editar link', async () => {
        renderPatientsTable(PATIENTS);

        await screen.findByText('Ana Gomez');
        screen.getByText('DNI 12345678');

        const link = screen.getByRole('link', { name: 'Editar' });
        expect(link.getAttribute('href')).toBe('/pacientes/1/editar');
    });

    it('renders the empty state for an empty list, with no Eliminar affordance in either state', async () => {
        const empty = renderPatientsTable([]);

        await screen.findAllByRole('columnheader');
        expect(screen.queryAllByRole('row')).toHaveLength(1);
        expect(screen.queryByText(/eliminar/i)).toBeNull();

        empty.unmount();

        renderPatientsTable(PATIENTS);
        await screen.findByText('Ana Gomez');
        expect(screen.queryByText(/eliminar/i)).toBeNull();
    });
});
