import { api } from '@/lib/api';
import { AMOXICILLIN, buildPrescription } from '@/tests/fixtures/prescription';
import type { MedicationProduct } from '@/types/medication';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrescriptionsDialog } from './PrescriptionsDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const MIGRAL: MedicationProduct = {
    gtin: '07795378001096',
    name: 'MIGRAL',
    presentation: '500 mg comp.x 20',
    pharmaceutical_form: 'Comprimidos/Pastillas/Tabletas/Grageas',
    administration_route: 'oral',
    laboratory: 'Montpellier',
    drug: 'ergotamina+cafeína+asoc.',
    therapeutic_action: 'Antimigrañoso',
    dispensing_condition: 'Venta Bajo Receta',
    control_mark: null,
    substances: ['ergotamina', 'cafeína'],
    composition_incomplete: true,
};

const MAXIBRAL: MedicationProduct = {
    ...MIGRAL,
    gtin: '07795378005568',
    name: 'MAXIBRAL XR',
    presentation: '37.5 mg cáps.x 30',
    drug: 'venlafaxina',
    therapeutic_action: 'Antidepresivo',
    dispensing_condition: 'Venta Bajo Receta Archivada',
    control_mark: 'PSICOTROPICO IV',
    substances: ['venlafaxina'],
    composition_incomplete: false,
};

function mockGets(products: MedicationProduct[] = [MIGRAL]) {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/medications') {
            return Promise.resolve({ data: { data: products } });
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
        .mock.calls.filter(([url]) => url.startsWith('/medications'));
}

async function type(value: string) {
    // base-ui only opens the popup on typing, which sets `inputType`.
    fireEvent.input(await screen.findByLabelText('Medicamento'), {
        target: { value },
        inputType: 'insertText',
    });
}

// Base UI picks an option on the pointer sequence, as a real click sends it.
function choose(option: HTMLElement) {
    fireEvent.pointerDown(option);
    fireEvent.pointerUp(option);
    fireEvent.click(option);
}

function submit() {
    fireEvent.change(screen.getByLabelText('Posología'), {
        target: { value: '1 cada 8 h' },
    });
    fireEvent.click(
        screen.getByRole('button', { name: 'Registrar medicación' }),
    );
}

// #377: «Medicamento» suggests products of the medication catalog, filled from
// the Buscador Nacional de Medicamentos, and stays free text.
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
            await screen.findByRole('option', { name: /MIGRAL — 500 mg/ }),
        ).toBeTruthy();
        expect(api.get).toHaveBeenCalledWith('/medications', {
            params: { q: 'migral' },
        });
    });

    it('shows at most ten suggestions', async () => {
        mockGets(
            Array.from({ length: 12 }, (_, index) => ({
                ...MIGRAL,
                gtin: String(7795378001000 + index).padStart(14, '0'),
                presentation: `comp.x ${index + 1}`,
            })),
        );
        renderDialog();

        await type('migral');
        const list = await screen.findByRole('listbox');

        expect(within(list).getAllByRole('option')).toHaveLength(10);
    });

    it('marks a controlled product and its archived prescription', async () => {
        mockGets([MAXIBRAL]);
        renderDialog();

        await type('maxibral');
        const suggestion = await screen.findByRole('option', {
            name: /MAXIBRAL XR/,
        });

        expect(within(suggestion).getByText('Psicotrópico IV')).toBeTruthy();
        expect(within(suggestion).getByText('Receta archivada')).toBeTruthy();
        expect(
            within(suggestion).getByText('venlafaxina · Montpellier'),
        ).toBeTruthy();
    });

    it('picking a suggestion fills the item with no second request and sends its GTIN', async () => {
        mockGets();
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await type('migral');
        choose(await screen.findByRole('option', { name: /MIGRAL — 500 mg/ }));

        expect(
            await screen.findByText(
                /Principio activo: ergotamina \+ cafeína y otros que el Buscador no detalla/,
            ),
        ).toBeTruthy();
        expect(screen.getByText('Bajo receta')).toBeTruthy();
        expect(
            (screen.getByLabelText('Medicamento') as HTMLInputElement).value,
        ).toBe('MIGRAL');
        expect(
            (screen.getByLabelText('Presentación') as HTMLInputElement).value,
        ).toBe('500 mg comp.x 20');
        expect(screen.queryByRole('option')).toBeNull();
        expect(catalogSearches()).toHaveLength(1);

        submit();

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/42/prescriptions',
                {
                    items: [
                        {
                            medication: 'MIGRAL',
                            presentation: '500 mg comp.x 20',
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
        choose(await screen.findByRole('option', { name: /MIGRAL — 500 mg/ }));
        await screen.findByText(/Principio activo/);
        await type('MIGRAL genérico');

        await waitFor(() =>
            expect(screen.queryByText(/Principio activo/)).toBeNull(),
        );
        submit();

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/42/prescriptions',
                {
                    items: [
                        expect.objectContaining({
                            medication: 'MIGRAL genérico',
                            gtin: null,
                        }),
                    ],
                },
            ),
        );
    });

    it('stays free text when the catalog suggests nothing', async () => {
        mockGets([]);
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await type('Preparado magistral');
        await waitFor(() => expect(catalogSearches()).toHaveLength(1));
        // No empty list drops down over the fields below.
        expect(screen.queryByRole('listbox')).toBeNull();

        submit();

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/42/prescriptions',
                {
                    items: [
                        expect.objectContaining({
                            medication: 'Preparado magistral',
                            gtin: null,
                        }),
                    ],
                },
            ),
        );
    });

    it('a pick hands the focus back to the field', async () => {
        mockGets();
        renderDialog();

        await type('migral');
        const suggestion = await screen.findByRole('option', {
            name: /MIGRAL — 500 mg/,
        });
        choose(suggestion);

        await screen.findByText(/Principio activo/);
        expect(document.activeElement).toBe(
            screen.getByLabelText('Medicamento'),
        );
    });

    it('announces the search, what it found and when it found nothing', async () => {
        mockGets();
        renderDialog();
        const status = () =>
            screen
                .getAllByRole('status')
                .find((element) => element.textContent !== '');

        await type('migral');
        await waitFor(() =>
            expect(status()?.textContent).toBe('Buscando sugerencias…'),
        );
        await waitFor(() => expect(status()?.textContent).toBe('1 sugerencia'));

        mockGets([]);
        await type('migralina');
        await waitFor(() =>
            expect(status()?.textContent).toBe(
                'Sin sugerencias: podés escribirlo a mano.',
            ),
        );
    });

    it("doesn't offer the previous term's suggestions for a new one", async () => {
        mockGets();
        renderDialog();

        await type('migral');
        await screen.findByRole('option', { name: /MIGRAL — 500 mg/ });
        let answer: (value: unknown) => void = () => {};
        vi.mocked(api.get).mockImplementation(
            () =>
                new Promise((resolve) => {
                    answer = resolve;
                }),
        );
        await type('maxibral');

        expect(screen.queryByRole('option')).toBeNull();
        await waitFor(() => expect(catalogSearches()).toHaveLength(2));
        expect(screen.queryByRole('option')).toBeNull();

        answer({ data: { data: [MAXIBRAL] } });
        expect(
            await screen.findByRole('option', { name: /MAXIBRAL XR/ }),
        ).toBeTruthy();
    });

    it("an amendment's prefilled item asks the catalog nothing and keeps its product", async () => {
        mockGets();
        renderDialog({
            amendOnOpen: buildPrescription({
                items: [
                    {
                        ...AMOXICILLIN,
                        gtin: '07790375001728',
                        snomed: '1234',
                        substances: ['amoxicilina'],
                        dispensing_condition: 'Venta Bajo Receta Archivada',
                        control_mark: 'VENTA VIGILADA',
                        composition_incomplete: true,
                    },
                ],
            }),
            allowCreate: false,
        });

        expect(
            ((await screen.findByLabelText('Medicamento')) as HTMLInputElement)
                .value,
        ).toBe('Amoxicilina');
        const form = screen.getByLabelText('Medicamento').closest('fieldset');
        expect(form).not.toBeNull();
        expect(
            within(form as HTMLElement).getByText(
                /Principio activo: amoxicilina y otros que el Buscador no detalla$/,
            ),
        ).toBeTruthy();
        expect(
            within(form as HTMLElement).getByText('Venta vigilada'),
        ).toBeTruthy();
        await new Promise((resolve) => setTimeout(resolve, 400));

        expect(catalogSearches()).toHaveLength(0);
    });
});

// #377 (merged from #375): the field and the allergies above it say what the
// warning compares, and Law 25.649 asks for the active ingredient.
describe('medication help', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('ties the help text to the field', async () => {
        mockGets();
        renderDialog();

        const input = await screen.findByLabelText('Medicamento');
        const help = screen.getByText(
            'Elegí una sugerencia o escribí el principio activo (por ejemplo, amoxicilina).',
        );

        expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(
            help.id,
        );
    });

    it('says what the allergy warning compares', async () => {
        mockGets();
        renderDialog();

        const allergies = await screen.findByRole('region', {
            name: 'Alergias vigentes',
        });

        expect(
            within(allergies).getByText(
                'Con un medicamento elegido de las sugerencias, Clini compara sus principios activos; escrito a mano, compara el texto. No reconoce familias de medicamentos.',
            ),
        ).toBeTruthy();
    });
});
