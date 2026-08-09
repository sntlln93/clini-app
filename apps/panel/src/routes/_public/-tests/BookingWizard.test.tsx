import { api } from '@/lib/api';
import type { BookingOrganization, BookingProfessional } from '@/types/booking';
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

const CARDIOLOGIA = { id: 1, name: 'Cardiología' };
const CLINICA_MEDICA = { id: 2, name: 'Clínica médica' };

const PROFESSIONALS: BookingProfessional[] = [
    {
        membership_id: 10,
        name: 'Dr. Uno',
        specialties: [CARDIOLOGIA],
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
    {
        membership_id: 20,
        name: 'Dra. Dos',
        specialties: [CLINICA_MEDICA],
        services: [
            {
                id: 200,
                name: 'Consulta clínica',
                duration_minutes: 20,
                price_cents: 4000,
                currency: 'ARS',
            },
        ],
    },
];

type Search = {
    specialty?: number;
    professional?: number;
    service?: number;
    date?: string;
};

function Wrapper({ initialSearch = {} }: { initialSearch?: Search }) {
    const [search, setSearch] = useState<Search>(initialSearch);

    return (
        <BookingWizard
            slug={ORGANIZATION.slug}
            organization={ORGANIZATION}
            professionals={PROFESSIONALS}
            slots={[]}
            search={search}
            onSearchChange={(next) =>
                setSearch((prev) => ({ ...prev, ...next }))
            }
        />
    );
}

function renderWizard(initialSearch: Search = {}) {
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
        component: () => <Wrapper initialSearch={initialSearch} />,
    });
    const routeTree = rootRoute.addChildren([bookingRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/reservar'] }),
    });
    render(<RouterProvider router={router} />);
}

async function selectComboboxOption(combobox: HTMLElement, optionText: string) {
    fireEvent.click(combobox);
    const option = await screen.findByRole('option', { name: optionText });
    /**
     * A bare `click` doesn't register in jsdom for an option that hasn't been
     * keyboard/pointer-highlighted in base-ui's roving-tabindex selection
     * group — the full pointer sequence is required.
     */
    fireEvent.pointerDown(option);
    fireEvent.pointerUp(option);
    fireEvent.click(option);
}

/**
 * The service select only mounts after a professional is chosen, so this
 * waits for it instead of assuming the previous update flushed synchronously.
 */
async function findServiceCombobox() {
    return waitFor(() => {
        const comboboxes = screen.getAllByRole('combobox');
        expect(comboboxes).toHaveLength(3);
        return comboboxes[2];
    });
}

/** Asserts the document's only heading is the expected h1 — with no other heading present, none can outrank it. */
function expectTopmostH1(name: string) {
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
    expect(headings[0]).toBe(screen.getByRole('heading', { level: 1, name }));
}

describe('BookingWizard selection cascade', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
    });

    it('limits the professional list to the chosen specialty, and the service list to the chosen professional', async () => {
        renderWizard();

        const [specialtyCombobox, professionalCombobox] =
            await screen.findAllByRole('combobox');

        await selectComboboxOption(specialtyCombobox, 'Cardiología');

        fireEvent.click(professionalCombobox);
        expect(
            await screen.findByRole('option', { name: 'Dr. Uno' }),
        ).not.toBeNull();
        expect(screen.queryByRole('option', { name: 'Dra. Dos' })).toBeNull();
        fireEvent.keyDown(professionalCombobox, { key: 'Escape' });

        await selectComboboxOption(professionalCombobox, 'Dr. Uno');

        const serviceCombobox = await findServiceCombobox();
        fireEvent.click(serviceCombobox);
        expect(
            await screen.findByRole('option', {
                name: 'Consulta cardiológica',
            }),
        ).not.toBeNull();
        expect(
            screen.queryByRole('option', { name: 'Consulta clínica' }),
        ).toBeNull();
    });

    it("choosing a professional directly (no specialty filter) limits services to that professional's own", async () => {
        renderWizard();

        const professionalCombobox = (
            await screen.findAllByRole('combobox')
        )[1];
        await selectComboboxOption(professionalCombobox, 'Dra. Dos');

        const serviceCombobox = await findServiceCombobox();
        fireEvent.click(serviceCombobox);
        expect(
            await screen.findByRole('option', { name: 'Consulta clínica' }),
        ).not.toBeNull();
        expect(
            screen.queryByRole('option', { name: 'Consulta cardiológica' }),
        ).toBeNull();
    });

    it("exposes the specialty select with accessible name 'Especialidad'", async () => {
        renderWizard();

        await screen.findAllByRole('combobox');

        expect(
            screen.getByRole('combobox', { name: 'Especialidad' }),
        ).not.toBeNull();
    });

    it("exposes the professional select with accessible name 'Profesional'", async () => {
        renderWizard();

        await screen.findAllByRole('combobox');

        expect(
            screen.getByRole('combobox', { name: 'Profesional' }),
        ).not.toBeNull();
    });

    it("exposes the service select with accessible name 'Prestación' once a professional is chosen", async () => {
        renderWizard();

        const professionalCombobox = (
            await screen.findAllByRole('combobox')
        )[1];
        await selectComboboxOption(professionalCombobox, 'Dra. Dos');

        await findServiceCombobox();

        expect(
            screen.getByRole('combobox', { name: 'Prestación' }),
        ).not.toBeNull();
    });

    it('shows the selection step with a single topmost h1 "Reservar turno"', async () => {
        renderWizard();

        await screen.findAllByRole('combobox');

        expectTopmostH1('Reservar turno');
    });

    it('shows the slot-picker step with a single topmost h1 "Elegí día y horario"', async () => {
        renderWizard({ professional: 10, service: 100 });

        await screen.findByRole('heading', { name: 'Elegí día y horario' });

        expectTopmostH1('Elegí día y horario');
    });
});
