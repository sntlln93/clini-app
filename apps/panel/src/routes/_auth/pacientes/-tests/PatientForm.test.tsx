import { api } from '@/lib/api';
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
import { describe, expect, it, vi } from 'vitest';
import { PatientForm } from '../-components/PatientForm';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

function unauthorizedError(data: unknown) {
    return { isAxiosError: true, response: { status: 422, data } };
}

function notFoundError() {
    return { isAxiosError: true, response: { status: 404, data: {} } };
}

function mockInsuranceProviders() {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
}

function mockLookupMiss() {
    vi.mocked(api.get).mockRejectedValueOnce(notFoundError());
}

function mockLookupHit(patient: Record<string, unknown>) {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: patient } });
}

function renderPatientForm() {
    const queryClient = new QueryClient();
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const nuevoRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes/nuevo',
        component: PatientForm,
    });
    const pacientesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes',
        component: () => <div>Pacientes</div>,
    });
    const routeTree = rootRoute.addChildren([nuevoRoute, pacientesRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/pacientes/nuevo'] }),
    });
    render(<RouterProvider router={router} />);
}

async function fillMinimalPatientForm() {
    fireEvent.change(await screen.findByLabelText('Nombre'), {
        target: { value: 'Juan Perez' },
    });
    fireEvent.click(screen.getByLabelText('Tipo de documento'));
    fireEvent.click(await screen.findByRole('option', { name: 'DNI' }));
    fireEvent.change(screen.getByLabelText('Número de documento'), {
        target: { value: '12345678' },
    });
}

describe('PatientForm', () => {
    it('posts the expected payload to /patients on submit', async () => {
        mockInsuranceProviders();
        mockLookupMiss();
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { data: { id: 1 } },
        });
        renderPatientForm();

        await fillMinimalPatientForm();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/patients', {
                name: 'Juan Perez',
                document_type: 'dni',
                document_number: '12345678',
                email: '',
                phone: '',
                sex: '',
                birth_date: '',
                insurance_provider_id: null,
            }),
        );
    });

    it('surfaces a 422 document_number message under that field', async () => {
        mockInsuranceProviders();
        mockLookupMiss();
        vi.mocked(api.post).mockRejectedValueOnce(
            unauthorizedError({
                message: 'Los datos ingresados no son válidos.',
                errors: {
                    document_number: [
                        'Ese número de documento ya está en uso.',
                    ],
                },
            }),
        );
        renderPatientForm();

        await fillMinimalPatientForm();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await screen.findByText('Ese número de documento ya está en uso.');
    });

    it('prefills empty fields and shows a reuse notice on an existing document', async () => {
        mockInsuranceProviders();
        mockLookupHit({
            id: 7,
            name: 'Juan Perez',
            email: 'juan@example.com',
            phone: '1122334455',
            document_type: 'dni',
            document_number: '12345678',
            sex: 'm',
            birth_date: '1990-01-01',
            insurance_provider_id: null,
        });
        renderPatientForm();

        await fillMinimalPatientForm();

        await screen.findByText(
            'Ya existe un paciente con este documento: se va a reutilizar el registro y solo se completarán los datos faltantes.',
        );
        await waitFor(() =>
            expect(
                (
                    screen.getByLabelText(
                        'Correo electrónico',
                    ) as HTMLInputElement
                ).value,
            ).toBe('juan@example.com'),
        );
        expect(
            (screen.getByLabelText('Teléfono') as HTMLInputElement).value,
        ).toBe('1122334455');
    });

    it('leaves the form untouched and shows no error when the document does not exist', async () => {
        mockInsuranceProviders();
        mockLookupMiss();
        renderPatientForm();

        await fillMinimalPatientForm();

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
        expect(
            (screen.getByLabelText('Correo electrónico') as HTMLInputElement)
                .value,
        ).toBe('');
        expect(
            (screen.getByLabelText('Teléfono') as HTMLInputElement).value,
        ).toBe('');
        expect(screen.queryByText(/ya existe un paciente/i)).toBeNull();
        expect(screen.queryByText(/ocurrió un error inesperado/i)).toBeNull();
    });
});
