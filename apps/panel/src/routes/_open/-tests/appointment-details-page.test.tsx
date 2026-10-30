import { api } from '@/lib/api';
import type { AppointmentDetailsResponse } from '@/types/booking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRouteWithContext,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as OpenRouteImport } from '../../_open';
import { Route as AppointmentRouteImport } from '../turno.$token';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
    refreshCsrfCookie: vi.fn(),
}));

const TOKEN = 'eyJpdiI6IkFCQyIsInZhbHVlIjoiREVGIiwibWFjIjoiMTIzIn0';

const DETAILS: AppointmentDetailsResponse = {
    organization: {
        name: 'Consultorio Salud',
        slug: 'consultorio-salud',
        timezone: 'America/Argentina/Buenos_Aires',
        show_clini_mark: true,
        logo_url: null,
    },
    appointment: {
        start_at: '2026-08-03T13:00:00Z',
        end_at: '2026-08-03T13:45:00Z',
        professional_name: 'Ana Gómez',
        service_name: 'Psicoterapia',
        organization_name: 'Consultorio Salud',
        organization_address:
            'Av. Pellegrini 1500, Rosario, Santa Fe, Argentina',
        calendar_uid: '0123456789abcdef0123456789abcdef@clini.test',
    },
    access_code: null,
};

// The real `_open` layout and details route, assembled the way `routeTree.gen.ts` does, for an anonymous patient.
function renderAppointment(path: string) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const rootRoute = createRootRouteWithContext<{
        queryClient: QueryClient;
    }>()({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    /* eslint-disable @typescript-eslint/no-explicit-any -- mirrors routeTree.gen.ts's own `.update()` calls */
    const openRoute = OpenRouteImport.update({
        id: '/_open',
        getParentRoute: () => rootRoute,
    } as any);
    const appointmentRoute = AppointmentRouteImport.update({
        id: '/turno/$token',
        path: '/turno/$token',
        getParentRoute: () => openRoute,
    } as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const router = createRouter({
        routeTree: rootRoute.addChildren([
            openRoute.addChildren([appointmentRoute]),
        ]),
        context: { queryClient },
        history: createMemoryHistory({ initialEntries: [path] }),
    });

    render(<RouterProvider router={router} />);
}

function apiError(status: number, data: unknown) {
    return { isAxiosError: true, response: { status, data } };
}

describe('the appointment details page the reminder links to', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('reads the appointment by the token in the link', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: DETAILS });
        renderAppointment(`/turno/${TOKEN}`);

        expect(
            await screen.findByRole('heading', {
                name: 'Tu turno en Consultorio Salud',
            }),
        ).not.toBeNull();
        expect(api.get).toHaveBeenCalledWith(`/booking/appointments/${TOKEN}`);
    });

    it('shows the professional, the service, the address and the time in the practice zone', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: DETAILS });
        renderAppointment(`/turno/${TOKEN}`);

        expect(await screen.findByText('Ana Gómez')).not.toBeNull();
        expect(screen.getByText('Psicoterapia')).not.toBeNull();
        expect(
            screen.getByText(
                'Av. Pellegrini 1500, Rosario, Santa Fe, Argentina',
            ),
        ).not.toBeNull();
        expect(screen.getByText(/3 de agosto de 2026.*10:00/)).not.toBeNull();
        expect(screen.getByText('Hecho con')).not.toBeNull();
    });

    // #320: the professional and the service stay on the page, never in what goes to a calendar provider.
    it('keeps the professional and the service out of the calendar links', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: DETAILS });
        renderAppointment(`/turno/${TOKEN}`);

        const google = await screen.findByRole('link', {
            name: /^Google Calendar/,
        });
        const ics = screen.getByRole('link', { name: 'Descargar .ics' });

        for (const href of [
            google.getAttribute('href'),
            ics.getAttribute('href'),
        ]) {
            // Google's query takes `+` for a space.
            const decoded = decodeURIComponent(
                (href ?? '').replace(/\+/g, ' '),
            );
            expect(decoded).toContain('Consultorio Salud');
            expect(decoded).not.toContain('Ana Gómez');
            expect(decoded).not.toContain('Psicoterapia');
        }
    });

    // #364: the code the patient shares is theirs to show, never something a calendar provider gets.
    it('shows the access code when the appointment has one, and keeps it out of the calendar links', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { ...DETAILS, access_code: 'ABCD-2345' },
        });
        renderAppointment(`/turno/${TOKEN}`);

        expect(
            await screen.findByRole('heading', {
                name: 'Tu código para el turno',
            }),
        ).not.toBeNull();
        expect(screen.getByText('ABCD-2345')).not.toBeNull();
        const google = screen.getByRole('link', { name: /^Google Calendar/ });
        expect(
            decodeURIComponent(google.getAttribute('href') ?? ''),
        ).not.toContain('ABCD');
    });

    it('shows no code section without a code', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: DETAILS });
        renderAppointment(`/turno/${TOKEN}`);

        await screen.findByText('Ana Gómez');
        expect(
            screen.queryByRole('heading', { name: 'Tu código para el turno' }),
        ).toBeNull();
    });

    it('tells the patient a stale link shows nothing, without a pointless retry', async () => {
        vi.mocked(api.get).mockRejectedValue(
            apiError(404, {
                error: {
                    code: 'booking.appointment_unavailable',
                    message:
                        'No appointment details are available for this link.',
                    context: {},
                },
            }),
        );
        renderAppointment(`/turno/${TOKEN}`);

        expect(
            await screen.findByText(
                'Este link ya no muestra el turno: puede haber pasado, o el consultorio lo canceló o lo reprogramó. Si tenés dudas, comunicate con el consultorio.',
            ),
        ).not.toBeNull();
        expect(
            screen.getByRole('heading', { name: 'Tu turno' }),
        ).not.toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('offers only a retry for a failure retrying can fix', async () => {
        vi.mocked(api.get).mockRejectedValue(apiError(500, {}));
        renderAppointment(`/turno/${TOKEN}`);

        expect(
            await screen.findByRole('button', { name: 'Reintentar' }),
        ).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
    });
});
