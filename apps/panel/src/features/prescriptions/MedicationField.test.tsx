import { api } from '@/lib/api';
import { buildPrescription } from '@/tests/fixtures/prescription';
import type { MedicationProduct } from '@/types/medication';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrescriptionsDialog } from './PrescriptionsDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const MIGRAL: MedicationProduct = {
    gtin: '07795378001096',
    commercial_name: 'MIGRAL 500',
    pharmaceutical_form: 'COMPRIMIDO RECUBIERTO',
    presentation: 'BLISTER por 20 UNIDADES',
    generic_name:
        'CAFEINA 100 MG + ERGOTAMINA TARTRATO 1 MG + DIPIRONA SODICA 500 MG',
    laboratory: 'QUIMICA MONTPELLIER S A',
    certificate_number: '19504',
    ingredients: null,
};

const MIGRAL_DETAIL: MedicationProduct = {
    ...MIGRAL,
    ingredients: [
        { name: 'CAFEINA', substance: 'cafeina', quantity: '100', unit: 'MG' },
        {
            name: 'DIPIRONA SODICA',
            substance: 'dipirona',
            quantity: '500',
            unit: 'MG',
        },
    ],
};

function mockGets(products: MedicationProduct[] = [MIGRAL]) {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/medications') {
            return Promise.resolve({ data: { data: products } });
        }
        if (url.startsWith('/medications/')) {
            return Promise.resolve({ data: { data: MIGRAL_DETAIL } });
        }
        if (url.endsWith('/allergies')) {
            return Promise.resolve({
                data: { data: [], meta: { reason_required: false } },
            });
        }

        return Promise.resolve({ data: { data: [] } });
    });
}

function renderDialog(
    props: Partial<ComponentProps<typeof PrescriptionsDialog>> = {},
) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <PrescriptionsDialog
                    open
                    onOpenChange={() => {}}
                    appointment={{ id: 42 }}
                    {...props}
                />
            </QueryClientProvider>
        ),
    });
    const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
}

function catalogSearches() {
    return vi
        .mocked(api.get)
        .mock.calls.filter(([url]) => url === '/medications');
}

async function type(value: string) {
    fireEvent.change(await screen.findByLabelText('Medicamento'), {
        target: { value },
    });
}

// #377: «Medicamento» suggests products of the medication catalog, filled from
// the national vademecum, and stays free text.
describe('medication suggestions', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
    });

    it('asks the catalog only from five characters on', async () => {
        mockGets();
        renderDialog();

        await type('migr');
        await new Promise((resolve) => setTimeout(resolve, 400));
        expect(catalogSearches()).toHaveLength(0);

        await type('migral');

        expect(
            await screen.findByRole('button', { name: /MIGRAL 500/ }),
        ).toBeTruthy();
        expect(api.get).toHaveBeenCalledWith('/medications', {
            params: { q: 'migral' },
        });
    });

    it('picking a suggestion fills the item, shows its active ingredients and sends its GTIN', async () => {
        mockGets();
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await type('migral');
        fireEvent.click(
            await screen.findByRole('button', { name: /MIGRAL 500/ }),
        );

        expect(
            await screen.findByText(
                /Principio activo: CAFEINA 100 MG \+ DIPIRONA SODICA 500 MG/,
            ),
        ).toBeTruthy();
        expect(
            (screen.getByLabelText('Medicamento') as HTMLInputElement).value,
        ).toBe('MIGRAL 500');
        expect(
            (screen.getByLabelText('Presentación') as HTMLInputElement).value,
        ).toBe('comprimido recubierto, blister por 20 unidades');
        expect(
            screen.queryByRole('list', {
                name: 'Sugerencias del Vademécum Nacional',
            }),
        ).toBeNull();

        fireEvent.change(screen.getByLabelText('Posología'), {
            target: { value: '1 cada 8 h' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar medicación' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/42/prescriptions',
                {
                    items: [
                        {
                            medication: 'MIGRAL 500',
                            presentation:
                                'comprimido recubierto, blister por 20 unidades',
                            dosage: '1 cada 8 h',
                            quantity: 1,
                            gtin: '07795378001096',
                        },
                    ],
                },
            ),
        );
    });

    it('typing again after a pick unlinks the item from the product', async () => {
        mockGets();
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await type('migral');
        fireEvent.click(
            await screen.findByRole('button', { name: /MIGRAL 500/ }),
        );
        await screen.findByText(/Principio activo/);
        await type('MIGRAL 500 genérico');

        await waitFor(() =>
            expect(screen.queryByText(/Principio activo/)).toBeNull(),
        );
        fireEvent.change(screen.getByLabelText('Posología'), {
            target: { value: '1 cada 8 h' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar medicación' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/42/prescriptions',
                {
                    items: [
                        expect.objectContaining({
                            medication: 'MIGRAL 500 genérico',
                            gtin: null,
                        }),
                    ],
                },
            ),
        );
    });

    it('stays free text when the catalog suggests nothing', async () => {
        mockGets([]);
        renderDialog();

        await type('Preparado magistral');
        await waitFor(() => expect(catalogSearches()).toHaveLength(1));

        expect(
            screen.queryByRole('list', {
                name: 'Sugerencias del Vademécum Nacional',
            }),
        ).toBeNull();
    });

    it("an amendment's prefilled name asks the catalog nothing", async () => {
        mockGets();
        renderDialog({ amendOnOpen: buildPrescription(), allowCreate: false });

        expect(
            ((await screen.findByLabelText('Medicamento')) as HTMLInputElement)
                .value,
        ).toBe('Amoxicilina');
        await new Promise((resolve) => setTimeout(resolve, 400));

        expect(catalogSearches()).toHaveLength(0);
    });
});
