import { api } from '@/lib/api';
import { buildVitalSign } from '@/tests/fixtures/vital-sign';
import type { VitalSign } from '@/types/vital-sign';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientVitalSignsCard } from '../-components/PatientVitalSignsCard';

const refresh = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const writes = vi.hoisted(() => ({
    restriction: null as 'subscription' | 'plan' | null,
}));
vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }));
vi.mock('@/lib/plan', () => ({
    useWritesRestriction: () => writes.restriction,
}));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));
// The acting membership is the fixture's author (membership_id 1).
vi.mock('@/lib/session', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/session')>()),
    useSession: () => ({ data: { membership: { id: 1 } } }),
}));

function renderCard(
    vitalSigns: VitalSign[],
    todaysAppointmentId: number | null = null,
) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <PatientVitalSignsCard
                patientId={10}
                vitalSigns={vitalSigns}
                todaysAppointmentId={todaysAppointmentId}
            />
        </QueryClientProvider>,
    );
}

describe('PatientVitalSignsCard', () => {
    beforeEach(() => {
        writes.restriction = null;
        refresh.mockClear();
        vi.mocked(api.post).mockReset();
        vi.mocked(api.post).mockResolvedValue({ data: {} });
    });

    it("says when no one has measured the patient yet, and records only on today's own appointment", () => {
        renderCard([]);

        expect(
            screen.getByText('Todavía no hay mediciones de este paciente.'),
        ).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'Registrar medición' }),
        ).toBeNull();
        expect(
            screen.getByText(
                'Podés registrar cuando tengas un turno con este paciente hoy.',
            ),
        ).toBeTruthy();
    });

    it('shows each latest value, the evolution and every measurement with its author', () => {
        renderCard([
            buildVitalSign({
                id: 2,
                membership_id: 2,
                author_name: 'Dr. Colega',
                measured_at: '2026-10-02T13:00:00Z',
                values: {
                    weight_kg: 72,
                    height_cm: null,
                    bmi: null,
                    heart_rate_bpm: 80,
                },
            }),
            buildVitalSign({ id: 1 }),
        ]);

        const latest = within(
            screen.getByRole('region', { name: 'Últimos valores' }),
        );
        expect(latest.getByText('72 kg')).toBeTruthy();
        expect(latest.getByText('170 cm')).toBeTruthy();
        expect(latest.getByText('80 lpm')).toBeTruthy();
        expect(screen.getByRole('region', { name: 'Evolución' })).toBeTruthy();
        const list = within(
            screen.getByRole('region', { name: 'Todas las mediciones' }),
        );
        expect(list.getAllByRole('listitem')).toHaveLength(2);
        expect(list.getByText(/Dr\. Colega/)).toBeTruthy();
    });

    // Reading the history never lets a colleague amend or annul (#361).
    it("offers amending and annulling only the reader's own measurements still in the series", () => {
        renderCard(
            [
                buildVitalSign({ id: 3, membership_id: 2 }),
                buildVitalSign({
                    id: 2,
                    annulment: {
                        reason: 'Otro paciente.',
                        created_at: '2026-10-02T13:00:00Z',
                    },
                }),
                buildVitalSign({ id: 1 }),
            ],
            7,
        );

        expect(
            screen.getAllByRole('button', { name: 'Enmendar' }),
        ).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: 'Anular' })).toHaveLength(
            1,
        );
        expect(screen.getByText('Motivo: Otro paciente.')).toBeTruthy();
    });

    it("records a measurement on today's appointment with only the values typed", async () => {
        renderCard([], 7);

        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar medición' }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        fireEvent.change(dialog.getByLabelText('Peso (kg)'), {
            target: { value: '70,5' },
        });
        fireEvent.click(
            dialog.getByRole('button', { name: 'Registrar medición' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/7/vital-signs',
                expect.objectContaining({
                    weight_kg: 70.5,
                    height_cm: null,
                    temperature_c: null,
                }),
            ),
        );
        expect(vi.mocked(api.post).mock.calls[0][1]).not.toHaveProperty(
            'reason',
        );
        await waitFor(() =>
            expect(refresh).toHaveBeenCalledWith([
                'patients',
                10,
                'vital-signs',
            ]),
        );
    });

    it('asks for at least one value before sending', async () => {
        renderCard([], 7);

        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar medición' }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        fireEvent.click(
            dialog.getByRole('button', { name: 'Registrar medición' }),
        );

        expect(
            await dialog.findByText('Cargá al menos un dato de la medición.'),
        ).toBeTruthy();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('amends a measurement on its own appointment, prefilled, with the reason', async () => {
        renderCard([buildVitalSign({ id: 4, appointment_id: 3 })], 7);

        fireEvent.click(screen.getByRole('button', { name: 'Enmendar' }));
        const dialog = within(await screen.findByRole('dialog'));
        expect(
            (dialog.getByLabelText('Peso (kg)') as HTMLInputElement).value,
        ).toBe('70.5');
        fireEvent.change(dialog.getByLabelText('Peso (kg)'), {
            target: { value: '71' },
        });
        fireEvent.change(
            dialog.getByLabelText('Motivo de la enmienda (opcional)'),
            {
                target: { value: 'Error de tipeo.' },
            },
        );
        fireEvent.click(
            dialog.getByRole('button', { name: 'Guardar enmienda' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/vital-signs/4/amendments',
                expect.objectContaining({
                    weight_kg: 71,
                    height_cm: 170,
                    reason: 'Error de tipeo.',
                }),
            ),
        );
    });

    it('annuls a measurement with a reason', async () => {
        renderCard([buildVitalSign({ id: 4 })], 7);

        fireEvent.click(screen.getByRole('button', { name: 'Anular' }));
        const dialog = within(await screen.findByRole('dialog'));
        fireEvent.change(dialog.getByLabelText('Motivo'), {
            target: { value: 'Era de otro paciente.' },
        });
        fireEvent.click(
            dialog.getByRole('button', { name: 'Anular medición' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/vital-signs/4/annulment', {
                reason: 'Era de otro paciente.',
            }),
        );
    });

    it('stays read-only while the subscription is not active', () => {
        writes.restriction = 'subscription';
        renderCard([buildVitalSign()], 7);

        expect(
            screen.getByText(
                'Tu suscripción no está activa: es de solo lectura.',
            ),
        ).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'Registrar medición' }),
        ).toBeNull();
        expect(screen.queryByRole('button', { name: 'Enmendar' })).toBeNull();
    });
});
