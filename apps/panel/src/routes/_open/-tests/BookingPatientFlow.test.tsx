import { api } from '@/lib/api';
import type {
    AvailableSlot,
    BookingOrganization,
    BookingProfessional,
} from '@/types/booking';
import type { InsuranceProvider } from '@/types/patient';
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
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingWizard } from '../-components/booking/BookingWizard';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const ORGANIZATION: BookingOrganization = {
    name: 'Consultorio Salud',
    slug: 'consultorio-salud',
    // An IANA zone on purpose: Luxon formats a bare 'UTC' (a fixed-offset zone) through formatToParts, which keeps a narrow no-break space before «p. m.».
    timezone: 'Etc/UTC',
    show_clini_mark: false,
    logo_url: null,
};

const PROFESSIONALS: BookingProfessional[] = [
    {
        membership_id: 10,
        name: 'Dr. Uno',
        specialties: [{ id: 1, name: 'Cardiología' }],
        services: [
            {
                id: 100,
                name: 'Consulta cardiológica',
                duration_minutes: 30,
                price_cents: 5000,
                currency: 'ARS',
            },
        ],
    },
];

const SLOT: AvailableSlot = {
    start_at: '2026-08-03T13:00:00.000000Z',
    end_at: '2026-08-03T13:30:00.000000Z',
};

function businessError(code: string, context: Record<string, unknown> = {}) {
    return {
        isAxiosError: true,
        response: {
            status: 409,
            data: { error: { code, message: 'Internal message.', context } },
        },
    };
}

function slotNotAvailableError() {
    return {
        isAxiosError: true,
        response: {
            status: 409,
            data: {
                error: {
                    code: 'booking.slot_not_available',
                    message:
                        "The requested slot is not among the professional's published availability.",
                    context: {},
                },
            },
        },
    };
}

// What the practice accepts; each test that needs providers sets it before rendering.
let insuranceProviders: InsuranceProvider[] = [];

type Search = {
    specialty?: number;
    professional?: number;
    service?: number;
    date?: string;
};

function Wrapper() {
    const [search, setSearch] = useState<Search>({
        professional: 10,
        service: 100,
        date: '2026-08-03',
    });

    return (
        <BookingWizard
            slug={ORGANIZATION.slug}
            organization={ORGANIZATION}
            professionals={PROFESSIONALS}
            insuranceProviders={insuranceProviders}
            slots={[SLOT]}
            search={search}
            onSearchChange={(next) =>
                setSearch((prev) => ({ ...prev, ...next }))
            }
        />
    );
}

function renderWizard() {
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
    const bookingRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/reservar',
        component: Wrapper,
    });
    const routeTree = rootRoute.addChildren([bookingRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/reservar'] }),
    });
    render(<RouterProvider router={router} />);

    return queryClient;
}

async function goToPatientForm(accepted: InsuranceProvider[] = []) {
    insuranceProviders = accepted;
    const queryClient = renderWizard();
    const slotButton = await screen.findByRole('button', {
        name: '01:00 p. m.',
    });
    fireEvent.click(slotButton);
    await screen.findByRole('heading', { name: 'Tus datos' });

    return queryClient;
}

function confirmedBooking() {
    return {
        data: {
            data: {
                start_at: SLOT.start_at,
                end_at: SLOT.end_at,
                professional_name: 'Dr. Uno',
                service_name: 'Consulta cardiológica',
                organization_name: ORGANIZATION.name,
            },
        },
    };
}

/** Asserts the document's only heading is the expected h1 — with no other heading present, none can outrank it. */
function expectTopmostH1(name: string) {
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
    expect(headings[0]).toBe(screen.getByRole('heading', { level: 1, name }));
}

function fillValidPatientData() {
    fireEvent.change(screen.getByLabelText('Nombre y apellido'), {
        target: { value: 'Juan Pérez' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'DNI' }));
    fireEvent.change(screen.getByLabelText('Número de documento'), {
        target: { value: '30111222' },
    });
}

describe('BookingPatientForm validation and submission', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
    });

    it('shows Spanish validation messages and posts the expected payload on confirm', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: {
                data: {
                    start_at: SLOT.start_at,
                    end_at: SLOT.end_at,
                    professional_name: 'Dr. Uno',
                    service_name: 'Consulta cardiológica',
                    organization_name: ORGANIZATION.name,
                },
            },
        });
        await goToPatientForm();

        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );

        await screen.findByText('El nombre y apellido es obligatorio.');
        // DNI comes preselected, so the document type never fails validation.
        expect(screen.queryByText('Elegí un tipo de documento.')).toBeNull();
        expect(
            screen
                .getByRole('radio', { name: 'DNI' })
                .getAttribute('aria-checked'),
        ).toBe('true');
        await screen.findByText('El número de documento es obligatorio.');
        expect(api.post).not.toHaveBeenCalled();

        fillValidPatientData();
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
        expect(api.post).toHaveBeenCalledWith(
            `/booking/${ORGANIZATION.slug}/appointments`,
            {
                membership_id: 10,
                service_id: 100,
                start_at: SLOT.start_at,
                patient: {
                    name: 'Juan Pérez',
                    document_type: 'dni',
                    document_number: '30111222',
                    email: null,
                    phone: null,
                    insurance_provider_id: null,
                    insurance_member_number: null,
                },
            },
        );
    });

    it('does not ask for an insurance provider when the practice accepts none', async () => {
        await goToPatientForm();

        expect(screen.queryByLabelText('Obra social (opcional)')).toBeNull();
    });

    it('offers only the accepted providers and sends the chosen one with its member number', async () => {
        vi.mocked(api.post).mockResolvedValueOnce(confirmedBooking());
        await goToPatientForm([
            { id: 7, name: 'Galeno' },
            { id: 3, name: 'OSDE' },
        ]);
        fillValidPatientData();
        expect(screen.queryByLabelText('N° de afiliado')).toBeNull();

        fireEvent.click(screen.getByLabelText('Obra social (opcional)'));
        const options = await screen.findAllByRole('option');
        expect(options.map((option) => option.textContent)).toEqual([
            'Sin obra social',
            'Galeno',
            'OSDE',
        ]);
        const osde = screen.getByRole('option', { name: 'OSDE' });
        // base-ui's roving-tabindex needs a real pointer sequence in jsdom; a bare `click` doesn't register.
        fireEvent.pointerDown(osde);
        fireEvent.pointerUp(osde);
        fireEvent.click(osde);

        const memberNumber = await screen.findByLabelText('N° de afiliado');
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );
        await screen.findByText('Ingresá el número de afiliado.');
        expect(api.post).not.toHaveBeenCalled();

        fireEvent.change(memberNumber, { target: { value: '61234567801' } });
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
        expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({
            patient: {
                insurance_provider_id: 3,
                insurance_member_number: '61234567801',
            },
        });
    });

    it('shows the API rejection of a provider under its field', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 422,
                data: {
                    message: 'El consultorio no atiende esa obra social.',
                    errors: {
                        'patient.insurance_provider_id': [
                            'El consultorio no atiende esa obra social.',
                        ],
                    },
                },
            },
        });
        await goToPatientForm([{ id: 3, name: 'OSDE' }]);
        fillValidPatientData();

        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );

        await waitFor(() =>
            expect(
                screen
                    .getByLabelText('Obra social (opcional)')
                    .getAttribute('aria-invalid'),
            ).toBe('true'),
        );
        expect(
            screen.getByText('El consultorio no atiende esa obra social.'),
        ).not.toBeNull();
    });

    it('sends the patient back to a refreshed grid with a notice and keeps their data when the slot was just taken (409)', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(slotNotAvailableError());
        const queryClient = await goToPatientForm();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

        fillValidPatientData();
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );

        await screen.findByRole('heading', { name: 'Elegí día y horario' });
        expect(
            screen.getByText('Ese horario se acaba de ocupar. Elegí otro.'),
        ).not.toBeNull();
        expect(invalidate).toHaveBeenCalledWith({
            queryKey: ['booking', ORGANIZATION.slug, 'slots'],
            refetchType: 'all',
        });
        expect(
            screen.queryByText(
                "The requested slot is not among the professional's published availability.",
            ),
        ).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: '01:00 p. m.' }));
        await screen.findByRole('heading', { name: 'Tus datos' });

        expect(
            (screen.getByLabelText('Nombre y apellido') as HTMLInputElement)
                .value,
        ).toBe('Juan Pérez');
        expect(
            (screen.getByLabelText('Número de documento') as HTMLInputElement)
                .value,
        ).toBe('30111222');
        expect(
            screen.queryByText('Ese horario se acaba de ocupar. Elegí otro.'),
        ).toBeNull();
    });

    it.each([
        [
            'an expired subscription',
            businessError('subscriptions.inactive', {
                subscription_status: 'expired',
            }),
        ],
        [
            'a plan over its professional limit',
            businessError('plans.professional_limit_exceeded', {
                plan: 'free',
                professional_limit: 1,
                active_professionals: 2,
            }),
        ],
    ])(
        'asks the patient to contact the practice, never naming the plan, for %s',
        async (_label, error) => {
            vi.mocked(api.post).mockRejectedValueOnce(error);
            await goToPatientForm();

            fillValidPatientData();
            fireEvent.click(
                screen.getByRole('button', { name: 'Confirmar turno' }),
            );

            expect(
                await screen.findByText(
                    'El consultorio no está tomando reservas online en este momento. Comunicate directamente con el consultorio para pedir un turno.',
                ),
            ).not.toBeNull();
            expect(screen.queryByText(/plan|suscripción|Ajustes/i)).toBeNull();
        },
    );

    it('points the patient to another month or the practice when the month is full, never naming the plan', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            businessError('plans.appointment_limit_reached', {
                appointment_limit: 40,
                month: '2026-08',
            }),
        );
        await goToPatientForm();

        fillValidPatientData();
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );

        expect(
            await screen.findByText(
                'No quedan turnos online para ese mes. Elegí una fecha de otro mes o comunicate directamente con el consultorio para pedir un turno.',
            ),
        ).not.toBeNull();
        expect(
            screen.queryByText(/plan|suscripción|Ajustes|límite/i),
        ).toBeNull();
    });

    it('keeps the typed data when the patient goes back to the grid by hand', async () => {
        await goToPatientForm();
        fillValidPatientData();

        fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
        fireEvent.click(
            await screen.findByRole('button', { name: '01:00 p. m.' }),
        );
        await screen.findByRole('heading', { name: 'Tus datos' });

        expect(
            (screen.getByLabelText('Nombre y apellido') as HTMLInputElement)
                .value,
        ).toBe('Juan Pérez');
    });

    it('shows the practice, the step and everything chosen so far on the patient-data step', async () => {
        await goToPatientForm();

        expect(screen.getByText(ORGANIZATION.name)).not.toBeNull();
        expect(screen.getByText('Paso 3 de 3')).not.toBeNull();
        expect(
            screen.getByText('Dr. Uno · Consulta cardiológica (30 min)'),
        ).not.toBeNull();
        expect(screen.getByText(/lunes, 3 de agosto.*UTC/)).not.toBeNull();
    });

    it('gives the patient next steps after confirming and lets them start another booking', async () => {
        vi.mocked(api.post).mockResolvedValueOnce(confirmedBooking());
        await goToPatientForm();
        fillValidPatientData();
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );

        await screen.findByText('Turno confirmado');
        expect(
            screen.getByText(
                `Guardá estos datos. Si necesitás cancelar o reprogramar el turno, comunicate con ${ORGANIZATION.name}.`,
            ),
        ).not.toBeNull();
        expect(screen.getByText('30 min')).not.toBeNull();
        expect(screen.getByText('$ 50,00')).not.toBeNull();
        expect(screen.queryByText(/te enviamos|correo/i)).toBeNull();

        fireEvent.click(
            screen.getByRole('button', { name: 'Reservar otro turno' }),
        );

        await screen.findByRole('heading', { name: 'Reservar turno' });
        expect(screen.getByText('Paso 1 de 3')).not.toBeNull();
        expect(screen.queryByText('Turno confirmado')).toBeNull();
    });

    it('shows the appointment summary after a successful confirmation and cannot be resubmitted', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: {
                data: {
                    start_at: SLOT.start_at,
                    end_at: SLOT.end_at,
                    professional_name: 'Dr. Uno',
                    service_name: 'Consulta cardiológica',
                    organization_name: ORGANIZATION.name,
                },
            },
        });
        await goToPatientForm();

        fillValidPatientData();
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );

        await screen.findByText('Turno confirmado');
        expect(screen.getByText('Consulta cardiológica')).not.toBeNull();
        expect(screen.getByText('Dr. Uno')).not.toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Confirmar turno' }),
        ).toBeNull();
        expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('shows the patient-form step with a single topmost h1 "Tus datos"', async () => {
        await goToPatientForm();

        expectTopmostH1('Tus datos');
    });

    it('shows the confirmation step with a single topmost h1 naming the organization', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: {
                data: {
                    start_at: SLOT.start_at,
                    end_at: SLOT.end_at,
                    professional_name: 'Dr. Uno',
                    service_name: 'Consulta cardiológica',
                    organization_name: ORGANIZATION.name,
                },
            },
        });
        await goToPatientForm();
        fillValidPatientData();
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );

        await screen.findByText('Turno confirmado');

        expectTopmostH1(ORGANIZATION.name);
    });
});
