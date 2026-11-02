import { api } from '@/lib/api';
import { buildMedicalHistoryEntry } from '@/tests/fixtures/medical-history';
import type { MedicalHistory } from '@/types/medical-history';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientMedicalHistoryCard } from '../-components/PatientMedicalHistoryCard';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/lib/plan', () => ({ useWritesRestriction: () => null }));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => () => Promise.resolve(),
}));
// The acting membership is the fixture's author (membership_id 1).
vi.mock('@/lib/session', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/session')>()),
    useSession: () => ({ data: { membership: { id: 1 } } }),
}));

const EMPTY: MedicalHistory = { blood_types: [], entries: [] };

function renderCard(history: MedicalHistory = EMPTY) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <PatientMedicalHistoryCard
                patientId={10}
                history={history}
                todaysAppointmentId={7}
            />
        </QueryClientProvider>,
    );
}

function mockSubstances(substances: string[]) {
    vi.mocked(api.get).mockResolvedValue({ data: { data: substances } });
}

function substanceSearches() {
    return vi
        .mocked(api.get)
        .mock.calls.filter(([url]) => url === '/medication-substances');
}

async function openAllergyDialog() {
    fireEvent.click(
        within(screen.getByRole('region', { name: 'Alergias' })).getByRole(
            'button',
            { name: 'Agregar' },
        ),
    );

    return within(await screen.findByRole('dialog'));
}

function type(input: HTMLElement, value: string) {
    // base-ui only opens the popup on typing, which sets `inputType`.
    fireEvent.input(input, { target: { value }, inputType: 'insertText' });
}

// Base UI picks an option on the pointer sequence, as a real click sends it.
function choose(option: HTMLElement) {
    fireEvent.pointerDown(option);
    fireEvent.pointerUp(option);
    fireEvent.click(option);
}

// #383: an allergy's «Sustancia» suggests the medication catalog's active
// substances and stays free text.
describe('allergy substance suggestions', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
        vi.mocked(api.post).mockResolvedValue({ data: {} });
    });

    it('records the substance picked from the suggestions as the catalog names it', async () => {
        mockSubstances(['amoxicilina', 'ácido clavulánico']);
        renderCard();
        const dialog = await openAllergyDialog();

        type(dialog.getByLabelText('Sustancia'), 'amoxi');
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(substanceSearches()).toHaveLength(0);

        type(dialog.getByLabelText('Sustancia'), 'Amoxic');
        choose(await screen.findByRole('option', { name: 'amoxicilina' }));

        expect(api.get).toHaveBeenCalledWith('/medication-substances', {
            params: { q: 'Amoxic' },
        });
        await waitFor(() =>
            expect(
                (dialog.getByLabelText('Sustancia') as HTMLInputElement).value,
            ).toBe('amoxicilina'),
        );
        fireEvent.click(dialog.getByRole('button', { name: 'Registrar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/7/medical-history-entries',
                {
                    category: 'allergy',
                    description: 'amoxicilina',
                    reaction: null,
                    severity: null,
                    approximate_date: null,
                },
            ),
        );
    });

    it('records free text when nothing in the catalog matches', async () => {
        mockSubstances([]);
        renderCard();
        const dialog = await openAllergyDialog();

        type(dialog.getByLabelText('Sustancia'), 'Látex natural');

        expect(
            await screen.findByText(
                'Sin sugerencias: podés escribirla a mano.',
            ),
        ).toBeTruthy();
        expect(screen.queryByRole('listbox')).toBeNull();
        fireEvent.click(dialog.getByRole('button', { name: 'Registrar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/7/medical-history-entries',
                expect.objectContaining({
                    category: 'allergy',
                    description: 'Látex natural',
                }),
            ),
        );
    });

    it('asks nothing for an amendment until the substance is typed', async () => {
        mockSubstances(['penicilina g benzatínica']);
        renderCard({
            ...EMPTY,
            entries: [buildMedicalHistoryEntry({ id: 5, appointment_id: 3 })],
        });

        fireEvent.click(screen.getByRole('button', { name: 'Enmendar' }));
        const dialog = within(await screen.findByRole('dialog'));
        await new Promise((resolve) => setTimeout(resolve, 400));

        expect(substanceSearches()).toHaveLength(0);
        expect(
            (dialog.getByLabelText('Sustancia') as HTMLInputElement).value,
        ).toBe('Penicilina');

        type(dialog.getByLabelText('Sustancia'), 'Penicilina g');

        expect(
            await screen.findByRole('option', {
                name: 'penicilina g benzatínica',
            }),
        ).toBeTruthy();
    });

    it('suggests nothing for an antecedent', async () => {
        mockSubstances(['amoxicilina']);
        renderCard();

        fireEvent.click(
            within(
                screen.getByRole('region', { name: 'Antecedentes personales' }),
            ).getByRole('button', { name: 'Agregar' }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        type(dialog.getByLabelText('Descripción'), 'Amoxicilina');
        await new Promise((resolve) => setTimeout(resolve, 400));

        expect(substanceSearches()).toHaveLength(0);
    });
});
