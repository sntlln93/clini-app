import { api } from '@/lib/api';
import type { Patient } from '@/types/patient';
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

function organizationForbiddenError() {
    return { isAxiosError: true, response: { status: 403, data: {} } };
}

function mockInsuranceProviders(
    providers: { id: number; name: string }[] = [],
) {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: providers } });
}

function mockInsuranceProvidersError() {
    vi.mocked(api.get).mockRejectedValueOnce(organizationForbiddenError());
}

function mockLookupMiss() {
    vi.mocked(api.get).mockRejectedValueOnce(notFoundError());
}

function mockLookupHit(patient: Record<string, unknown>) {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: patient } });
}

function renderPatientForm(patient?: Patient) {
    // Disable retries here (independent of the app's shared queryClient
    // policy) so a rejected query surfaces its error immediately instead of
    // exhausting React Query's default retry/backoff before assertions run.
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
    const nuevoRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes/nuevo',
        component: () => <PatientForm patient={patient} />,
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
    fireEvent.click(screen.getByRole('radio', { name: 'DNI' }));
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

    it('shows a client-side validation message for the empty required Nombre field and does not call POST /patients', async () => {
        mockInsuranceProviders();
        renderPatientForm();

        await screen.findByLabelText('Nombre');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await screen.findByText('El nombre es obligatorio.');
        expect(api.post).not.toHaveBeenCalled();
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

    it('shows the error state instead of an empty/silent select when the insurance-providers query fails', async () => {
        mockInsuranceProvidersError();
        renderPatientForm();

        await screen.findByText(
            'Tu cuenta no tiene una organización activa. Pedí acceso a un administrador para ver los pacientes.',
        );
        expect(screen.getByLabelText('Obra social')).not.toBeNull();
    });

    it('keeps the Obra social select working when the insurance-providers query succeeds', async () => {
        mockInsuranceProviders([{ id: 1, name: 'OSDE' }]);
        renderPatientForm();

        fireEvent.click(await screen.findByLabelText('Obra social'));
        await screen.findByRole('option', { name: 'OSDE' });

        expect(
            screen.queryByText(
                'Tu cuenta no tiene una organización activa. Pedí acceso a un administrador para ver los pacientes.',
            ),
        ).toBeNull();
        expect(
            screen.queryByText(
                'No pudimos cargar la información. Intentá nuevamente.',
            ),
        ).toBeNull();
    });

    it('shows the insurance provider name at mount in edit mode, not the raw id', async () => {
        mockInsuranceProviders([
            { id: 1, name: 'OSDE' },
            { id: 2, name: 'Swiss Medical' },
        ]);
        renderPatientForm({
            id: 7,
            name: 'Juan Perez',
            email: 'juan@example.com',
            phone: '1122334455',
            document_type: 'dni',
            document_number: '12345678',
            sex: 'm',
            birth_date: '1990-01-01',
            insurance_provider_id: 2,
            created_at: '2026-01-01T00:00:00Z',
        });

        const trigger = await screen.findByLabelText('Obra social');
        await waitFor(() =>
            expect(trigger.textContent).toContain('Swiss Medical'),
        );
        expect(trigger.textContent).not.toContain('2');
    });

    it('shows the placeholder, not an empty value or 0, in create mode', async () => {
        mockInsuranceProviders([{ id: 1, name: 'OSDE' }]);
        renderPatientForm();

        const trigger = await screen.findByLabelText('Obra social');
        expect(trigger.textContent).toContain('Sin obra social');
        expect(trigger.textContent).not.toContain('0');
    });
});
