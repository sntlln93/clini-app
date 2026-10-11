import { expectNoA11yViolations } from '@/tests/a11y';
import { buildProfessional } from '@/tests/fixtures/professional';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportView } from '../-components/ReportView';
import { buildReport } from './fixtures';

function renderView(props: Partial<Parameters<typeof ReportView>[0]> = {}) {
    return render(
        <ReportView
            report={buildReport()}
            professionals={[buildProfessional({ id: 5 })]}
            membershipId={undefined}
            onFiltersChange={vi.fn()}
            {...props}
        />,
    );
}

describe('ReportView', () => {
    // jsdom lays nothing out; a chart is only drawn once its container measures a size.
    beforeEach(() => {
        vi.spyOn(
            HTMLElement.prototype,
            'getBoundingClientRect',
        ).mockReturnValue(DOMRect.fromRect({ width: 640, height: 256 }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows the period totals, one row per professional and every chart', () => {
        const { container } = renderView();

        const summary = screen.getByRole('region', {
            name: 'Resumen del período',
        });
        expect(within(summary).getByText(/36,4\s?%/)).toBeTruthy();
        expect(
            within(summary).getByText('4 h con turnos de 11 h publicadas'),
        ).toBeTruthy();
        expect(
            within(summary).getByText(
                '2 ausentes de 6 turnos que llegaron a su hora',
            ),
        ).toBeTruthy();
        expect(within(summary).getByText('Pacientes nuevos')).toBeTruthy();

        const row = screen.getByRole('row', { name: /Ana Pérez/ });
        expect(within(row).getByText(/42,9\s?%/)).toBeTruthy();
        expect(within(row).getByText('3 h / 7 h')).toBeTruthy();
        expect(within(row).getByText('1 / 3')).toBeTruthy();

        for (const title of [
            'Ocupación',
            'Ausentismo',
            'Reservas online y en el panel',
            'Pacientes nuevos por mes',
        ]) {
            expect(screen.getAllByText(title).length).toBeGreaterThan(0);
        }
        // A chart root without `responsive` inside `ChartContainer` renders no SVG at all (#267).
        const charts = container.querySelectorAll('[data-slot="chart"]');
        expect(charts).toHaveLength(4);
        for (const chart of charts) {
            expect(chart.querySelector('svg.recharts-surface')).not.toBeNull();
        }
    });

    it("hides the organization's new patients when the report covers one professional", () => {
        renderView({ report: buildReport({ new_patients: null }) });

        expect(screen.queryByText('Pacientes nuevos')).toBeNull();
        expect(screen.queryByText('Pacientes nuevos por mes')).toBeNull();
    });

    it('offers the professional picker only with a roster', () => {
        const { unmount } = renderView();
        expect(
            screen.getByRole('combobox', { name: 'Profesional' }).textContent,
        ).toContain('Todos los profesionales');
        unmount();

        renderView({ professionals: [] });
        expect(
            screen.queryByRole('combobox', { name: 'Profesional' }),
        ).toBeNull();
        expect(
            screen.getByRole('combobox', { name: 'Agrupar' }).textContent,
        ).toContain('Por semana');
    });

    it('says so instead of an empty table when nobody had activity', () => {
        renderView({ report: buildReport({ professionals: [] }) });

        expect(
            screen.getByText(
                'No hay profesionales con actividad en el período.',
            ),
        ).toBeTruthy();
    });

    it('has no axe violations', async () => {
        const { container } = renderView();

        await expectNoA11yViolations(container);
    });
});
