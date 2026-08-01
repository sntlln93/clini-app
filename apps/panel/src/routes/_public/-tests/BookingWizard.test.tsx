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
    // A single option that hasn't been keyboard/pointer-highlighted yet isn't
    // part of the roving-tabindex group base-ui uses for selection — a bare
    // `click` doesn't register in jsdom, it needs the full pointer sequence a
    // real browser would generate.
    fireEvent.pointerDown(option);
    fireEvent.pointerUp(option);
    fireEvent.click(option);
}

/**
 * The service select only mounts once a professional is chosen — waits for
 * the third combobox to actually appear instead of assuming the state update
 * from the previous selection has already flushed synchronously.
 */
async function findServiceCombobox() {
    return waitFor(() => {
        const comboboxes = screen.getAllByRole('combobox');
        expect(comboboxes).toHaveLength(3);
        return comboboxes[2];
    });
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

        // Only Dr. Uno (Cardiología) remains selectable as professional.
        fireEvent.click(professionalCombobox);
        expect(
            await screen.findByRole('option', { name: 'Dr. Uno' }),
        ).not.toBeNull();
        expect(screen.queryByRole('option', { name: 'Dra. Dos' })).toBeNull();
        fireEvent.keyDown(professionalCombobox, { key: 'Escape' });

        await selectComboboxOption(professionalCombobox, 'Dr. Uno');

        // The service select now only shows Dr. Uno's own service.
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
});
