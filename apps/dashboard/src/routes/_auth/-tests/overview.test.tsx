import type { OverviewKpis, OverviewSeriesPoint } from '@/types/overview';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppointmentsCreatedChart } from '../-components/AppointmentsCreatedChart';
import { KpiGrid } from '../-components/KpiGrid';
import { SignupsChart } from '../-components/SignupsChart';

const KPIS: OverviewKpis = {
    organizations: { total: 2, suspended: 1, new_in_period: 2 },
    users: { total: 24, verified: 20, blocked: 1, new_in_period: 5 },
    patients: { total: 26, new_in_period: 4 },
    appointments: { total: 80, created_in_period: 30, upcoming: 12 },
    subscriptions: {
        none: 1,
        pending: 0,
        active: 1,
        grace: 0,
        expired: 0,
        cancelled: 0,
    },
    mrr: {
        amount: 15000,
        currency: 'ARS',
        paying_subscriptions: 1,
        plan_amount: 15000,
    },
};

const ZERO_POINTS: OverviewSeriesPoint[] = [
    { date: '2026-10-03', organizations: 0, users: 0, appointments: 0 },
    { date: '2026-10-04', organizations: 0, users: 0, appointments: 0 },
];

const normalize = (text: string | null) => text?.replace(/\s/g, ' ');

describe('KpiGrid', () => {
    it('renders the MRR formatted as whole ARS pesos with its hint', () => {
        render(<KpiGrid kpis={KPIS} />);

        const mrr = screen
            .getByText('MRR estimado')
            .closest('[data-slot="card"]');
        expect(normalize(mrr?.textContent ?? null)).toContain('$ 15.000');
        screen.getByText('Suscripciones activas y en gracia × precio del plan');
    });

    it('renders the subscription breakdown, "Sin suscripción" included', () => {
        render(<KpiGrid kpis={KPIS} />);

        const card = screen
            .getByText('Suscripciones')
            .closest('[data-slot="card"]') as HTMLElement;
        for (const label of [
            'Pendiente',
            'Activa',
            'En gracia',
            'Vencida',
            'Cancelada',
            'Sin suscripción',
        ]) {
            expect(card.textContent).toContain(label);
        }
    });

    it('shows the supporting figures of each headline number', () => {
        render(<KpiGrid kpis={KPIS} />);

        screen.getByText('1 suspendidas');
        screen.getByText('20 verificados · 1 bloqueados');
        screen.getByText('12 próximos');
    });
});

describe('overview charts', () => {
    it('show the empty-period message instead of a flat line when every value is 0', () => {
        render(
            <>
                <SignupsChart points={ZERO_POINTS} />
                <AppointmentsCreatedChart points={ZERO_POINTS} />
            </>,
        );

        expect(screen.getAllByText('Sin datos para el período.')).toHaveLength(
            2,
        );
    });

    it('render the plot and a table view when there is data', () => {
        const points = [
            { ...ZERO_POINTS[0], users: 3, appointments: 2 },
            ZERO_POINTS[1],
        ];
        render(<SignupsChart points={points} />);

        expect(screen.queryByText('Sin datos para el período.')).toBeNull();
        screen.getByText('Ver datos en tabla');
        screen.getByRole('cell', { name: '03/10/2026' });
    });
});
