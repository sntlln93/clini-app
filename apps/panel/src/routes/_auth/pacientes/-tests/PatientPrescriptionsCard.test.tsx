import {
    AMOXICILLIN,
    buildPrescription as buildSharedPrescription,
} from '@/tests/fixtures/prescription';
import type { Prescription } from '@/types/prescription';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientPrescriptionsCard } from '../-components/PatientPrescriptionsCard';

const refresh = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const writes = vi.hoisted(() => ({
    restriction: null as 'subscription' | 'plan' | null,
    included: true,
}));
vi.mock('@/lib/plan', () => ({
    useWritesRestriction: () => writes.restriction,
    usePlanIncludes: () => writes.included,
}));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));

// The agenda's own dialog, tested in features/prescriptions: here only what
// the card hands it matters.
vi.mock('@/features/prescriptions/PrescriptionsDialog', () => ({
    PrescriptionsDialog: (props: {
        open: boolean;
        appointment: { id: number } | null;
        amendOnOpen?: { id: number } | null;
        allowCreate?: boolean;
        onSaved?: () => void;
    }) =>
        props.open ? (
            <div role="dialog" aria-label="Medicación indicada">
                Turno {props.appointment?.id}
                {props.amendOnOpen && ` · enmienda ${props.amendOnOpen.id}`}
                {props.allowCreate ? ' · alta' : ' · solo enmienda'}
                <button type="button" onClick={props.onSaved}>
                    Guardar
                </button>
            </div>
        ) : null,
}));

// Its own dialog, tested with the agenda's in features/prescriptions.
vi.mock('@/features/prescriptions/AnnulPrescriptionDialog', () => ({
    AnnulPrescriptionDialog: (props: {
        prescription: Prescription | null;
        onAnnulled: (prescription: Prescription) => void;
    }) =>
        props.prescription ? (
            <div role="dialog" aria-label="Anular medicación">
                Anula {props.prescription.id}
                <button
                    type="button"
                    onClick={() =>
                        props.prescription &&
                        props.onAnnulled(props.prescription)
                    }
                >
                    Confirmar
                </button>
            </div>
        ) : null,
}));

const AMOXICILLIN_DAILY = {
    ...AMOXICILLIN,
    presentation: null,
    dosage: '1 cada 8 h',
};

function buildPrescription(
    overrides: Partial<Prescription> = {},
): Prescription {
    return buildSharedPrescription({
        items: [AMOXICILLIN_DAILY],
        ...overrides,
    });
}

function renderCard(
    prescriptions: Prescription[],
    todaysAppointmentId: number | null = null,
) {
    render(
        <PatientPrescriptionsCard
            patientId={10}
            prescriptions={prescriptions}
            todaysAppointmentId={todaysAppointmentId}
        />,
    );
}

describe('PatientPrescriptionsCard', () => {
    beforeEach(() => {
        writes.restriction = null;
        writes.included = true;
        refresh.mockClear();
    });

    it('shows an empty state when the professional has recorded none', async () => {
        renderCard([]);

        expect(
            await screen.findByText(
                'Todavía no registraste medicación para este paciente.',
            ),
        ).toBeTruthy();
    });

    // Nothing prints the record anymore (#319), so the card shows it in full.
    it('lists each record with every item in full and no print link', async () => {
        renderCard([
            buildPrescription({ id: 7 }),
            buildPrescription({
                id: 8,
                items: [
                    {
                        id: 2,
                        position: 0,
                        medication: 'Ibuprofeno',
                        presentation: 'Comprimidos 400 mg',
                        dosage: 'Si hay dolor',
                        quantity: 1,
                    },
                ],
            }),
        ]);

        expect(await screen.findByText('Medicación indicada')).toBeTruthy();
        expect(screen.getByText('Amoxicilina')).toBeTruthy();
        expect(screen.getByText('1 cada 8 h · Cantidad: 2')).toBeTruthy();
        expect(
            screen.getByText('Ibuprofeno — Comprimidos 400 mg'),
        ).toBeTruthy();
        expect(screen.getByText('Si hay dolor · Cantidad: 1')).toBeTruthy();
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.queryByText(/receta/i)).toBeNull();
    });

    it('an amended record shows its current items and every earlier version (#323)', async () => {
        const ibuprofen = {
            ...AMOXICILLIN_DAILY,
            id: 2,
            medication: 'Ibuprofeno',
        };
        renderCard([
            buildPrescription({
                version: 2,
                amended_at: '2026-08-04T10:00:00Z',
                items: [ibuprofen],
                versions: [
                    {
                        version: 1,
                        reason: null,
                        created_at: '2026-08-03T10:15:00Z',
                        items: [AMOXICILLIN_DAILY],
                    },
                    {
                        version: 2,
                        reason: 'Alergia.',
                        created_at: '2026-08-04T10:00:00Z',
                        items: [ibuprofen],
                    },
                ],
            }),
        ]);

        expect(await screen.findByText(/Ver las 2 versiones/)).toBeTruthy();
        expect(screen.getByText('Motivo: Alergia.')).toBeTruthy();
        expect(screen.getAllByText('Ibuprofeno')).toHaveLength(2);
        expect(screen.getByText('Amoxicilina')).toBeTruthy();
    });

    // A record belongs to an appointment, as a note does (#217).
    it('offers no record without an own appointment today, and says why', () => {
        renderCard([]);

        expect(
            screen.getByText(
                /Podés registrarla cuando tengas un turno con este paciente hoy\./,
            ),
        ).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'Registrar medicación' }),
        ).toBeNull();
    });

    it("records on today's own appointment, as the agenda does, and reloads the list", () => {
        renderCard([], 31);

        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar medicación' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Medicación indicada',
        });
        expect(dialog.textContent).toContain('Turno 31 · alta');

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(refresh).toHaveBeenCalledWith(['prescriptions', 'patient', 10]);
    });

    // A new record only on today's own appointment, never on the amended one's.
    it('amends a record on its own appointment, with no new record there', () => {
        renderCard([buildPrescription({ id: 7, appointment_id: 55 })], 31);

        fireEvent.click(screen.getByRole('button', { name: 'Enmendar' }));

        expect(
            screen.getByRole('dialog', { name: 'Medicación indicada' })
                .textContent,
        ).toContain('Turno 55 · enmienda 7 · solo enmienda');
    });

    it("amending a record of today's own appointment still allows a new one there", () => {
        renderCard([buildPrescription({ id: 7, appointment_id: 31 })], 31);

        fireEvent.click(screen.getByRole('button', { name: 'Enmendar' }));

        expect(
            screen.getByRole('dialog', { name: 'Medicación indicada' })
                .textContent,
        ).toContain('Turno 31 · enmienda 7 · alta');
    });

    it('annuls a record with a reason and reloads the list (#344)', () => {
        renderCard([buildPrescription({ id: 7 })], 31);

        fireEvent.click(screen.getByRole('button', { name: 'Anular' }));
        expect(
            screen.getByRole('dialog', { name: 'Anular medicación' })
                .textContent,
        ).toContain('Anula 7');

        fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

        expect(refresh).toHaveBeenCalledWith(['prescriptions', 'patient', 10]);
    });

    it('annulled medication says when and why, keeps its items behind a disclosure, as an annulled note does, and takes no action', () => {
        renderCard([
            buildPrescription({
                id: 7,
                annulment: {
                    reason: 'Paciente equivocado.',
                    created_at: '2026-08-10T10:00:00Z',
                },
            }),
        ]);

        expect(screen.getByText('Anulada')).toBeTruthy();
        expect(screen.getByText('Motivo: Paciente equivocado.')).toBeTruthy();
        const disclosure = screen
            .getByText('Ver la medicación anulada')
            .closest('details');
        expect(disclosure?.open).toBe(false);
        expect(disclosure?.textContent).toContain('Amoxicilina');
        expect(screen.queryByRole('button', { name: 'Enmendar' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull();
    });

    it.each([
        ['subscription', true, /Tu suscripción no está activa/],
        ['plan', true, /El plan Gratis incluye un solo profesional activo/],
        [null, false, /es parte del plan Consultorio/],
    ] as const)(
        'offers neither a record nor an amendment while read-only (%s, included: %s), and says why',
        (restriction, included, reason) => {
            writes.restriction = restriction;
            writes.included = included;
            renderCard([buildPrescription({ id: 7 })], 31);

            expect(
                screen.queryByRole('button', { name: 'Registrar medicación' }),
            ).toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Enmendar' }),
            ).toBeNull();
            expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull();
            expect(screen.getByText(reason)).toBeTruthy();
            expect(screen.queryByText(/Podés registrarla/)).toBeNull();
        },
    );
});
