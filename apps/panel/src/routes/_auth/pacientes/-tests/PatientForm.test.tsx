import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { buildContact } from '@/tests/fixtures/patient';
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

// The lookup is a POST too, so its answer is queued ahead of the form's own.
function mockLookupMiss() {
    vi.mocked(api.post).mockRejectedValueOnce(notFoundError());
}

function mockLookupHit(patient: Record<string, unknown>) {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: patient } });
}

const EXISTING_PATIENT: Patient = {
    id: 7,
    name: 'Juan Perez',
    contacts: [
        buildContact({
            id: 1,
            value: '+541122334455',
            display: '011 2233-4455',
            needs_confirmation: true,
        }),
    ],
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

function contactInput(row: number, label: 'Número' | 'Correo') {
    return within(
        screen.getByRole('group', { name: `Contacto ${row}` }),
    ).getByLabelText(label) as HTMLInputElement;
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
                contacts: [],
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
        expect(api.post).not.toHaveBeenCalledWith(
            '/patients',
            expect.anything(),
        );

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

    it('shows a member number taken by a concurrent registration under that field', async () => {
        mockLookupMiss();
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'patients.insurance_member_number_taken',
                        message:
                            'The insurance member number is already registered for another patient.',
                    },
                },
            },
        });
        renderPatientForm(undefined, [{ id: 1, name: 'OSDE' }]);

        await fillMinimalPatientForm();
        await pickInsuranceProvider('OSDE');
        const memberNumber = await screen.findByLabelText('N° de afiliado');
        fireEvent.change(memberNumber, { target: { value: '37415820' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await screen.findByText(
            'Ese número de afiliado ya está registrado para otro paciente de la misma obra social. Revisá que esté bien escrito.',
        );
        expect(memberNumber.getAttribute('aria-invalid')).toBe('true');
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
            contacts: [
                buildContact({
                    id: 1,
                    type: 'email',
                    value: 'juan@example.com',
                    display: 'juan@example.com',
                }),
                buildContact({
                    id: 2,
                    value: '+541122334455',
                    display: '011 2233-4455',
                }),
            ],
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
            expect(contactInput(1, 'Correo').value).toBe('juan@example.com'),
        );
        expect(contactInput(2, 'Número').value).toBe('011 2233-4455');
        expect(screen.queryByRole('group', { name: 'Contacto 3' })).toBeNull();
    });

    it('keeps a typed contact the found patient lacks, drops one it has, and never offers an unconfirmed one', async () => {
        mockLookupHit({
            ...EXISTING_PATIENT,
            contacts: [
                buildContact({
                    id: 1,
                    type: 'email',
                    value: 'juan@example.com',
                    display: 'juan@example.com',
                }),
                buildContact({
                    id: 2,
                    value: '+541122334455',
                    display: '011 2233-4455',
                    needs_confirmation: true,
                }),
            ],
        });
        renderPatientForm();

        fireEvent.change(await screen.findByLabelText('Nombre'), {
            target: { value: 'Juan Perez' },
        });
        fireEvent.change(contactInput(1, 'Número'), {
            target: { value: '11 4000-0000' },
        });
        fireEvent.change(contactInput(2, 'Correo'), {
            target: { value: 'Juan@Example.com' },
        });
        fireEvent.change(screen.getByLabelText('Número de documento'), {
            target: { value: '12345678' },
        });

        await waitFor(() =>
            expect(contactInput(1, 'Correo').value).toBe('juan@example.com'),
        );
        expect(contactInput(2, 'Número').value).toBe('11 4000-0000');
        expect(screen.queryByRole('group', { name: 'Contacto 3' })).toBeNull();
        expect(screen.queryByText(/Lo agregó una reserva online/)).toBeNull();
    });

    it('leaves the form untouched and shows no error when the document does not exist', async () => {
        mockLookupMiss();
        renderPatientForm();

        await fillMinimalPatientForm();

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
        expect(contactInput(1, 'Número').value).toBe('');
        expect(contactInput(2, 'Correo').value).toBe('');
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
            expect(api.post).toHaveBeenCalledWith('/patients/lookup', {
                document_type: 'dni',
                document_number: '12345678',
            }),
        );
    });

    it('starts with an empty phone and email, a phone input for the number', async () => {
        renderPatientForm();

        await screen.findByRole('group', { name: 'Contacto 1' });
        expect(contactInput(1, 'Número').getAttribute('type')).toBe('tel');
        expect(contactInput(2, 'Correo').getAttribute('type')).toBe('email');
    });

    it('sends only the filled contacts, with their labels, and drops a removed one', async () => {
        mockLookupMiss();
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { data: { id: 1 } },
        });
        renderPatientForm();

        await fillMinimalPatientForm();
        fireEvent.change(contactInput(2, 'Correo'), {
            target: { value: ' juan@example.com ' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Agregar contacto' }),
        );
        fireEvent.change(contactInput(3, 'Número'), {
            target: { value: '11 4000-0000' },
        });
        fireEvent.change(
            within(
                screen.getByRole('group', { name: 'Contacto 3' }),
            ).getByLabelText('Etiqueta (opcional)'),
            { target: { value: 'madre' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Agregar contacto' }),
        );
        fireEvent.change(contactInput(4, 'Número'), {
            target: { value: '11 5000-0000' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Quitar contacto 4' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/patients',
                expect.objectContaining({
                    contacts: [
                        { type: 'email', value: 'juan@example.com', label: '' },
                        {
                            type: 'phone',
                            value: '11 4000-0000',
                            label: 'madre',
                        },
                    ],
                }),
            ),
        );
    });

    it('shows an API error on a contact under the row the user filled, not the sent index', async () => {
        mockLookupMiss();
        vi.mocked(api.post).mockRejectedValueOnce(
            unauthorizedError({
                message: 'El correo no es válido.',
                errors: { 'contacts.0.value': ['El correo no es válido.'] },
            }),
        );
        renderPatientForm();

        await fillMinimalPatientForm();
        fireEvent.change(contactInput(2, 'Correo'), {
            target: { value: 'juan@example' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        const group = screen.getByRole('group', { name: 'Contacto 2' });
        await within(group).findByText('El correo no es válido.');
        expect(
            within(
                screen.getByRole('group', { name: 'Contacto 1' }),
            ).queryByText('El correo no es válido.'),
        ).toBeNull();
    });

    it('explains, in the edit form, what saving does to a contact nobody confirmed', async () => {
        renderPatientForm(EXISTING_PATIENT);

        expect((await screen.findAllByRole('group')).length).toBeGreaterThan(0);
        expect(contactInput(1, 'Número').value).toBe('011 2233-4455');
        screen.getByText(/Lo agregó una reserva online/);
    });
});
