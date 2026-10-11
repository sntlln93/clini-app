import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentsByStatusChart } from '../-components/AppointmentsByStatusChart';
import { AppointmentsPerDayChart } from '../-components/AppointmentsPerDayChart';
import { PatientsCard } from '../-components/PatientsCard';

describe('estadísticas charts', () => {
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

    // A chart root without `responsive` inside `ChartContainer` renders no SVG at all (#267).
    it('draw every plot at its container size', () => {
        const { container } = render(
            <>
                <AppointmentsPerDayChart
                    perDay={[
                        { date: '2026-10-03', total: 3, online: 1, manual: 2 },
                    ]}
                />
                <PatientsCard
                    patients={{
                        new: 2,
                        per_day: [{ date: '2026-10-03', count: 2 }],
                    }}
                />
                <AppointmentsByStatusChart
                    byStatus={{
                        scheduled: 1,
                        confirmed: 2,
                        arrived: 0,
                        completed: 3,
                        no_show: 1,
                        cancelled: 0,
                        rescheduled: 0,
                    }}
                />
            </>,
        );

        const charts = container.querySelectorAll('[data-slot="chart"]');
        expect(charts).toHaveLength(3);
        for (const chart of charts) {
            expect(
                chart
                    .querySelector('svg.recharts-surface')
                    ?.getAttribute('width'),
            ).toBe('640');
        }
    });
});
