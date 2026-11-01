import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import {
    ChartContainer,
    ChartTooltip,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartDataTable } from '@/features/charts/ChartDataTable';
import { formatShortDateTime } from '@/lib/datetime';
import { CENTILES, formatPercentile } from '@/lib/growth-standards/who-growth';
import {
    formatVitalSignValue,
    VITAL_SIGN_FIELDS,
    type VitalSignField,
} from '@/lib/vital-signs';
import {
    ageAxisOf,
    CENTILE_STROKES,
    measurementNear,
    type GrowthChart,
    type GrowthPoint,
} from './growth-chart';
import { GrowthCurvesLegend } from './GrowthCurvesLegend';

type Curves = Extract<GrowthChart, { status: 'curves' }>;

const chartConfig = {
    value: { label: 'Paciente', color: 'var(--chart-2)' },
    centile: { label: 'Percentiles OMS', color: 'var(--muted-foreground)' },
} satisfies ChartConfig;

// One followed value against the WHO curves for the patient's sex (#363):
// the measurements by age, each with its percentile, over P3–P97.
export function GrowthCurvesChart({
    field,
    chart,
}: {
    field: VitalSignField;
    chart: Curves;
}) {
    const { label } = VITAL_SIGN_FIELDS[field];
    const axis = ageAxisOf(chart.domain);

    return (
        <>
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-64 w-full"
            >
                <LineChart
                    responsive
                    accessibilityLayer
                    data={chart.rows}
                    margin={{ left: 0, right: 12, top: 8, bottom: 12 }}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        type="number"
                        dataKey="ageMonths"
                        domain={chart.domain}
                        ticks={axis.ticks}
                        tickFormatter={axis.format}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        label={{
                            value: axis.label,
                            position: 'insideBottom',
                            offset: -8,
                            className: 'fill-muted-foreground text-xs',
                        }}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={({ active, label }) => (
                            <GrowthTooltip
                                field={field}
                                point={
                                    active && typeof label === 'number'
                                        ? measurementNear(chart, label)
                                        : undefined
                                }
                            />
                        )}
                    />
                    {CENTILES.map(({ key }) => (
                        <Line
                            key={key}
                            dataKey={key}
                            type="monotone"
                            stroke="var(--color-centile)"
                            strokeWidth={key === 'p50' ? 1.5 : 1}
                            strokeDasharray={CENTILE_STROKES[key]}
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                            tooltipType="none"
                        />
                    ))}
                    <Line
                        dataKey="value"
                        type="monotone"
                        stroke="var(--color-value)"
                        strokeWidth={2}
                        connectNulls
                        dot
                    />
                </LineChart>
            </ChartContainer>
            <GrowthCurvesLegend sex={chart.sex} />
            <ChartDataTable
                caption={`Evolución: ${label}, con su percentil de la OMS`}
                columns={[
                    { key: 'date', label: 'Fecha' },
                    { key: 'age', label: 'Edad' },
                    { key: 'value', label },
                    { key: 'percentile', label: 'Percentil' },
                ]}
                rows={[...chart.points].reverse().map((point) => ({
                    date: formatShortDateTime(point.measuredAt),
                    age: point.age,
                    value: formatVitalSignValue(field, point.value),
                    percentile:
                        point.percentile === null
                            ? '—'
                            : formatPercentile(point.percentile),
                }))}
            />
        </>
    );
}

// Only near a measurement: «12 meses · 9 kg · P22» and when it was taken.
function GrowthTooltip({
    field,
    point,
}: {
    field: VitalSignField;
    point: GrowthPoint | undefined;
}) {
    if (point === undefined) {
        return null;
    }

    return (
        <div className="grid min-w-32 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <span className="font-medium">
                {point.age} · {formatShortDateTime(point.measuredAt)}
            </span>
            <span className="flex justify-between gap-4">
                <span className="font-mono font-medium text-foreground tabular-nums">
                    {formatVitalSignValue(field, point.value)}
                </span>
                {point.percentile !== null && (
                    <span className="font-mono text-muted-foreground tabular-nums">
                        {formatPercentile(point.percentile)}
                    </span>
                )}
            </span>
        </div>
    );
}
