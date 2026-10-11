import { render } from '@testing-library/react';
import { Bar, BarChart } from 'recharts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ChartConfig, ChartContainer } from './chart';

const config = { count: { label: 'Turnos' } } satisfies ChartConfig;

function measureAs(width: number, height: number) {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ width, height }),
    );
}

function renderChart() {
    return render(
        <ChartContainer config={config} className="h-64 w-full">
            <BarChart responsive data={[{ day: 'lun', count: 3 }]}>
                <Bar dataKey="count" />
            </BarChart>
        </ChartContainer>,
    );
}

describe('ChartContainer', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('draws the chart at the size its container measures', () => {
        measureAs(640, 256);

        const { container } = renderChart();

        const surface = container.querySelector('svg.recharts-surface');
        expect(surface?.getAttribute('width')).toBe('640');
        expect(surface?.getAttribute('height')).toBe('256');
    });

    // Suspense hides the previous page with `display: none` while a slow loader shows the pending component,
    // so the chart measures 0×0; recharts' ResponsiveContainer warned then, failing the e2e console fixture (#267).
    it('writes nothing to the console while its container measures 0×0', () => {
        measureAs(0, 0);
        const warn = vi.spyOn(console, 'warn');

        const { container } = renderChart();

        expect(warn).not.toHaveBeenCalled();
        expect(container.querySelector('svg.recharts-surface')).toBeNull();
    });
});
