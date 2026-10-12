import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import type { InsuranceProvider, Patient } from '@/types/patient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientForm } from '../-components/PatientForm';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

function unauthorizedError(data: unknown) {
    return { isAxiosError: true, response: { status: 422, data } };
}

function notFoundError() {
    return { isAxiosError: true, response: { status: 404, data: {} } };
}

function mockLookupMiss() {
    vi.mocked(api.get).mockRejectedValueOnce(notFoundError());
}

function mockLookupHit(patient: Record<string, unknown>) {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: patient } });
}

const EXISTING_PATIENT: Patient = {
    id: 7,
    name: 'Juan Perez',
    email: 'juan@example.com',
    phone: '1122334455',
    document_type: 'dni',
    document_number: '12345678',
    sex: 'm',
    birth_date: '1990-01-01',
    insurance_provider_id: 2,
    insurance_member_number: '37415820',
    created_at: '2026-01-01T00:00:00Z',
};

function renderPatientForm(
    patient?: Patient,
    insuranceProviders: InsuranceProvider[] = [],
) {
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
        component: () => (
            <PatientForm
                patient={patient}
                insuranceProviders={insuranceProviders}
            />
        ),
    });
    const pacientesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes',
        component: () => <div>Pacientes</div>,
    });
    const detalleRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes/$id',
        component: () => <div>Ficha del paciente</div>,
    });
    const routeTree = rootRoute.addChildren([
        nuevoRoute,
        pacientesRoute,
        detalleRoute,
    ]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/pacientes/nuevo'] }),
    });
    render(<RouterProvider router={router} />);

    return router;
}

async function pickInsuranceProvider(name: string) {
    fireEvent.click(screen.getByLabelText('Obra social (opcional)'));
    const option = await screen.findByRole('option', { name });
    // base-ui's roving-tabindex needs a real pointer sequence in jsdom; a bare `click` doesn't register.
    fireEvent.pointerDown(option);
    fireEvent.pointerUp(option);
    fireEvent.click(option);
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
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
        vi.mocked(api.put).mockReset();
        vi.mocked(notifySuccess).mockReset();
    });

    it('posts the expected payload to /patients on submit', async () => {
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
                insurance_member_number: '',
            }),
        );
    });

    it('asks for the member number once an insurance provider is chosen and sends it with it', async () => {
        mockLookupMiss();
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { data: { id: 1 } },
        });
        renderPatientForm(undefined, [{ id: 1, name: 'OSDE' }]);

        await fillMinimalPatientForm();
        expect(screen.queryByLabelText('N° de afiliado')).toBeNull();
        await pickInsuranceProvider('OSDE');

        const memberNumber = await screen.findByLabelText('N° de afiliado');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
        await screen.findByText('Ingresá el número de afiliado.');
        expect(api.post).not.toHaveBeenCalled();

        fireEvent.change(memberNumber, { target: { value: '37415820' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/patients',
                expect.objectContaining({
                    insurance_provider_id: 1,
                    insurance_member_number: '37415820',
                }),
            ),
        );
    });

    it('lets a provider picked by mistake be undone, dropping the member number requirement', async () => {
        mockLookupMiss();
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { data: { id: 1 } },
        });
        renderPatientForm(undefined, [{ id: 1, name: 'OSDE' }]);

        await fillMinimalPatientForm();
        await pickInsuranceProvider('OSDE');
        await screen.findByLabelText('N° de afiliado');

        await pickInsuranceProvider('Sin obra social');
        await waitFor(() =>
            expect(screen.queryByLabelText('N° de afiliado')).toBeNull(),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/patients',
                expect.objectContaining({ insurance_provider_id: null }),
            ),
        );
    });

    it('offers only DNI and passport as identity documents', async () => {
        renderPatientForm();

        await screen.findByRole('radio', { name: 'DNI' });
        expect(screen.getByRole('radio', { name: 'Pasaporte' })).toBeTruthy();
        expect(
            screen.queryByRole('radio', { name: 'Carnet de obra social' }),
        ).toBeNull();
    });

    it('shows a client-side validation message for the empty required Nombre field and does not call POST /patients', async () => {
        renderPatientForm();

        await screen.findByLabelText('Nombre');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await screen.findByText('El nombre es obligatorio.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('surfaces a 422 document_number message under that field', async () => {
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

        const notice = await screen.findByRole('status');
        await waitFor(() =>
            expect(notice.textContent).toContain(
                'Ya existe un paciente con este documento (Juan Perez): se va a reutilizar el registro y solo se completarán los datos faltantes.',
            ),
        );
        // The match may belong to another organization only, whose page answers 403 (#266).
        expect(within(notice).queryByRole('link')).toBeNull();
        await waitFor(() =>
            expect(
                (
                    screen.getByLabelText(
                        'Correo electrónico (opcional)',
                    ) as HTMLInputElement
                ).value,
            ).toBe('juan@example.com'),
        );
        expect(
            (screen.getByLabelText('Teléfono (opcional)') as HTMLInputElement)
                .value,
        ).toBe('1122334455');
    });

    it('leaves the form untouched and shows no error when the document does not exist', async () => {
        mockLookupMiss();
        renderPatientForm();

        await fillMinimalPatientForm();

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
        expect(
            (
                screen.getByLabelText(
                    'Correo electrónico (opcional)',
                ) as HTMLInputElement
            ).value,
        ).toBe('');
        expect(
            (screen.getByLabelText('Teléfono (opcional)') as HTMLInputElement)
                .value,
        ).toBe('');
        expect(screen.queryByText(/ya existe un paciente/i)).toBeNull();
        expect(screen.queryByText(/ocurrió un error inesperado/i)).toBeNull();
    });

    it('keeps the Obra social select working with the loaded insurance providers', async () => {
        renderPatientForm(undefined, [{ id: 1, name: 'OSDE' }]);

        fireEvent.click(await screen.findByLabelText('Obra social (opcional)'));
        await screen.findByRole('option', { name: 'OSDE' });
    });

    it('shows the saved member number in edit mode', async () => {
        renderPatientForm(EXISTING_PATIENT, [{ id: 2, name: 'Swiss Medical' }]);

        expect(
            (
                (await screen.findByLabelText(
                    'N° de afiliado',
                )) as HTMLInputElement
            ).value,
        ).toBe('37415820');
    });

    it('shows the insurance provider name at mount in edit mode, not the raw id', async () => {
        renderPatientForm(EXISTING_PATIENT, [
            { id: 1, name: 'OSDE' },
            { id: 2, name: 'Swiss Medical' },
        ]);

        const trigger = await screen.findByLabelText('Obra social (opcional)');
        await waitFor(() =>
            expect(trigger.textContent).toContain('Swiss Medical'),
        );
        expect(trigger.textContent).not.toContain('2');
    });

    it('shows the placeholder, not an empty value or 0, in create mode', async () => {
        renderPatientForm(undefined, [{ id: 1, name: 'OSDE' }]);

        const trigger = await screen.findByLabelText('Obra social (opcional)');
        expect(trigger.textContent).toContain('Sin obra social');
        expect(trigger.textContent).not.toContain('0');
    });

    it('confirms the creation and lands on the new patient detail page', async () => {
        mockLookupMiss();
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { data: { id: 31 } },
        });
        const router = renderPatientForm();

        await fillMinimalPatientForm();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await screen.findByText('Ficha del paciente');
        expect(router.state.location.pathname).toBe('/pacientes/31');
        expect(notifySuccess).toHaveBeenCalledWith('Paciente creado');
    });

    it('confirms an edit and goes back to that patient detail page', async () => {
        vi.mocked(api.put).mockResolvedValueOnce({
            data: { data: EXISTING_PATIENT },
        });
        const router = renderPatientForm(EXISTING_PATIENT);

        fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }));

        await screen.findByText('Ficha del paciente');
        expect(api.put).toHaveBeenCalledWith(
            '/patients/7',
            expect.objectContaining({ name: 'Juan Perez' }),
        );
        expect(router.state.location.pathname).toBe('/pacientes/7');
        expect(notifySuccess).toHaveBeenCalledWith('Cambios guardados');
    });

    it('links Cancelar to the list in create mode', async () => {
        renderPatientForm();

        expect(
            (
                await screen.findByRole('link', { name: 'Cancelar' })
            ).getAttribute('href'),
        ).toBe('/pacientes');
    });

    it('links Cancelar to the patient detail page in edit mode', async () => {
        renderPatientForm(EXISTING_PATIENT);

        expect(
            (
                await screen.findByRole('link', { name: 'Cancelar' })
            ).getAttribute('href'),
        ).toBe('/pacientes/7');
    });

    it('preselects DNI on create, so typing only the number triggers the lookup', async () => {
        mockLookupMiss();
        renderPatientForm();

        const dni = await screen.findByRole('radio', { name: 'DNI' });
        expect(dni.getAttribute('aria-checked')).toBe('true');
        expect(
            screen
                .getByLabelText('Número de documento')
                .getAttribute('inputmode'),
        ).toBe('numeric');

        fireEvent.change(screen.getByLabelText('Número de documento'), {
            target: { value: '12345678' },
        });

        await waitFor(() =>
            expect(api.get).toHaveBeenCalledWith('/patients/lookup', {
                params: { document_type: 'dni', document_number: '12345678' },
            }),
        );
    });

    it('uses a phone input type for Teléfono', async () => {
        renderPatientForm();

        expect(
            (await screen.findByLabelText('Teléfono (opcional)')).getAttribute(
                'type',
            ),
        ).toBe('tel');
    });
});
