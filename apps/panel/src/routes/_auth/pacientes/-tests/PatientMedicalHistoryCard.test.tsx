import { api } from '@/lib/api';
import {
    buildBloodTypeRecord,
    buildMedicalHistoryEntry,
} from '@/tests/fixtures/medical-history';
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

const refresh = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }));
vi.mock('@/lib/plan', () => ({ useWritesRestriction: () => null }));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));
// The acting membership is the fixture's author (membership_id 1).
vi.mock('@/lib/session', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/session')>()),
    useSession: () => ({ data: { membership: { id: 1 } } }),
}));

const EMPTY: MedicalHistory = { blood_types: [], entries: [] };

function renderCard(
    history: MedicalHistory,
    todaysAppointmentId: number | null = 7,
) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <PatientMedicalHistoryCard
                patientId={10}
                history={history}
                todaysAppointmentId={todaysAppointmentId}
            />
        </QueryClientProvider>,
    );
}

function section(name: string) {
    return within(screen.getByRole('region', { name }));
}

describe('PatientMedicalHistoryCard', () => {
    beforeEach(() => {
        refresh.mockClear();
        vi.mocked(api.post).mockReset();
        vi.mocked(api.post).mockResolvedValue({ data: {} });
    });

    it("says what is not recorded yet, and records nothing without today's own appointment", () => {
        renderCard(EMPTY, null);

        expect(
            section('Grupo sanguíneo').getByText('Sin registrar.'),
        ).toBeTruthy();
        expect(section('Alergias').getByText('Sin registrar.')).toBeTruthy();
        expect(
            section('Antecedentes familiares').getByText('Sin registrar.'),
        ).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Agregar' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Registrar' })).toBeNull();
    });

    it('shows the current blood type with every earlier one kept', () => {
        renderCard({
            ...EMPTY,
            blood_types: [
                buildBloodTypeRecord({
                    id: 2,
                    blood_type: 'A-',
                    reason: 'Nuevo análisis.',
                }),
                buildBloodTypeRecord({
                    id: 1,
                    blood_type: 'A+',
                    author_name: 'Dr. Colega',
                }),
            ],
        });

        const bloodType = section('Grupo sanguíneo');
        expect(bloodType.getByText('A-')).toBeTruthy();
        expect(bloodType.getByText(/Motivo: Nuevo análisis\./)).toBeTruthy();
        expect(bloodType.getByText('Ver los valores anteriores')).toBeTruthy();
        expect(bloodType.getByText('A+')).toBeTruthy();
        expect(bloodType.getByRole('button', { name: 'Cambiar' })).toBeTruthy();
    });

    it("lists each allergy with its details, the withdrawn ones after and marked, and changes only the reader's own", () => {
        renderCard({
            ...EMPTY,
            entries: [
                buildMedicalHistoryEntry({
                    id: 3,
                    description: 'Polen',
                    reaction: null,
                    severity: null,
                    withdrawal: {
                        reason: 'Ya no la tiene.',
                        created_at: '2026-10-05T13:00:00Z',
                    },
                }),
                buildMedicalHistoryEntry({
                    id: 2,
                    membership_id: 2,
                    description: 'Látex',
                    author_name: 'Dr. Colega',
                }),
                buildMedicalHistoryEntry({ id: 1 }),
            ],
        });

        const allergies = section('Alergias');
        const items = allergies.getAllByRole('listitem');
        expect(
            items.map((item) => item.querySelector('p')?.textContent),
        ).toEqual(['Látex', 'Penicilina', 'Polen']);
        expect(
            allergies.getAllByText('Urticaria · Severidad grave'),
        ).toHaveLength(2);
        expect(within(items[2]).getByText('Ya no vigente')).toBeTruthy();
        expect(
            within(items[2]).getByText(/Motivo: Ya no la tiene\./),
        ).toBeTruthy();
        expect(
            allergies.getAllByRole('button', { name: 'Enmendar' }),
        ).toHaveLength(1);
        expect(
            within(items[1]).getByRole('button', { name: 'Dar de baja' }),
        ).toBeTruthy();
    });

    it('records an antecedent of the section it was opened from, with its date', async () => {
        renderCard(EMPTY);

        fireEvent.click(
            section('Antecedentes quirúrgicos').getByRole('button', {
                name: 'Agregar',
            }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        expect(
            dialog.getByText('Registrar antecedente quirúrgico'),
        ).toBeTruthy();
        expect(dialog.queryByLabelText('Reacción (opcional)')).toBeNull();
        fireEvent.change(dialog.getByLabelText('Descripción'), {
            target: { value: 'Apendicectomía' },
        });
        fireEvent.change(dialog.getByLabelText('Fecha aproximada (opcional)'), {
            target: { value: '2015' },
        });
        fireEvent.click(dialog.getByRole('button', { name: 'Registrar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/7/medical-history-entries',
                {
                    category: 'surgical',
                    description: 'Apendicectomía',
                    reaction: null,
                    severity: null,
                    approximate_date: '2015',
                },
            ),
        );
        await waitFor(() =>
            expect(refresh).toHaveBeenCalledWith([
                'patients',
                10,
                'medical-history',
            ]),
        );
    });

    it('amends an allergy, prefilled, on its own appointment', async () => {
        renderCard({
            ...EMPTY,
            entries: [buildMedicalHistoryEntry({ id: 5, appointment_id: 3 })],
        });

        fireEvent.click(screen.getByRole('button', { name: 'Enmendar' }));
        const dialog = within(await screen.findByRole('dialog'));
        expect(
            (dialog.getByLabelText('Sustancia') as HTMLInputElement).value,
        ).toBe('Penicilina');
        fireEvent.change(dialog.getByLabelText('Reacción (opcional)'), {
            target: { value: 'Edema' },
        });
        fireEvent.click(
            dialog.getByRole('button', { name: 'Guardar enmienda' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/medical-history-entries/5/amendments',
                {
                    description: 'Penicilina',
                    reaction: 'Edema',
                    severity: 'severe',
                    approximate_date: null,
                    reason: null,
                },
            ),
        );
    });

    it('withdraws an entry with no reason needed', async () => {
        renderCard({
            ...EMPTY,
            entries: [buildMedicalHistoryEntry({ id: 5 })],
        });

        fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
        const dialog = within(await screen.findByRole('dialog'));
        fireEvent.click(dialog.getByRole('button', { name: 'Dar de baja' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/medical-history-entries/5/withdrawal',
                {
                    reason: null,
                },
            ),
        );
    });

    it('asks to choose the blood type before recording it', async () => {
        renderCard(EMPTY);

        fireEvent.click(
            section('Grupo sanguíneo').getByRole('button', {
                name: 'Registrar',
            }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        fireEvent.click(dialog.getByRole('button', { name: 'Guardar' }));

        expect(
            await dialog.findByText('Elegí el grupo sanguíneo.'),
        ).toBeTruthy();
        expect(api.post).not.toHaveBeenCalled();
    });
});
