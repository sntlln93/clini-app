import { api } from '@/lib/api';
import type {
    AvailableSlot,
    BookingOrganization,
    BookingProfessional,
} from '@/types/booking';
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
    timezone: 'UTC',
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
}

async function goToPatientForm() {
    renderWizard();
    const slotButton = await screen.findByRole('button', {
        name: '01:00 p. m.',
    });
    fireEvent.click(slotButton);
    await screen.findByRole('heading', { name: 'Tus datos' });
}

function fillValidPatientData() {
    fireEvent.change(screen.getByLabelText('Nombre'), {
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

        await screen.findByText('El nombre es obligatorio.');
        await screen.findByText('Elegí un tipo de documento.');
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
                },
            },
        );
    });

    it('renders the Spanish catalog copy for a 409 booking.slot_not_available error, never the backend message', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(slotNotAvailableError());
        await goToPatientForm();

        fillValidPatientData();
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar turno' }),
        );

        await screen.findByText(
            'Ese horario ya no está disponible. Elegí otro turno.',
        );
        expect(
            screen.queryByText(
                "The requested slot is not among the professional's published availability.",
            ),
        ).toBeNull();
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
});
