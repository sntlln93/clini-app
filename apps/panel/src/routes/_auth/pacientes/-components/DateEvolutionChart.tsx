import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartDataTable } from '@/features/charts/ChartDataTable';
import { formatShortDateTime, fromInstant } from '@/lib/datetime';
import {
    formatVitalSignValue,
    VITAL_SIGN_FIELDS,
    type VitalSignField,
} from '@/lib/vital-signs';

const chartConfig = {
    value: { label: 'Valor', color: 'var(--chart-1)' },
} satisfies ChartConfig;

// One followed value over the dates it was measured (#361), and the same
// values as a table.
export function DateEvolutionChart({
    field,
    series,
}: {
    field: VitalSignField;
    series: { measuredAt: string; value: number }[];
}) {
    const { label } = VITAL_SIGN_FIELDS[field];

    return (
        <>
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-56 w-full"
            >
                <LineChart
                    responsive
                    accessibilityLayer
                    data={series}
                    margin={{ left: 0, right: 12, top: 8 }}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="measuredAt"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={16}
                        tickFormatter={(iso: string) =>
                            fromInstant(iso).toFormat('dd/MM/yy')
                        }
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={
                            <ChartTooltipContent
                                labelFormatter={(_, payload) => {
                                    const point = payload?.[0]?.payload as
                                        { measuredAt: string } | undefined;

                                    return point
                                        ? formatShortDateTime(point.measuredAt)
                                        : '';
                                }}
                                formatter={(value) => (
                                    <span className="flex w-full justify-between gap-4">
                                        <span className="text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="font-mono font-medium text-foreground tabular-nums">
                                            {formatVitalSignValue(
                                                field,
                                                Number(value),
                                            )}
                                        </span>
                                    </span>
                                )}
                            />
                        }
                    />
                    <Line
                        dataKey="value"
                        type="monotone"
                        stroke="var(--color-value)"
                        strokeWidth={2}
                        dot
                    />
                </LineChart>
            </ChartContainer>
            <ChartDataTable
                caption={`Evolución: ${label}`}
                columns={[
                    { key: 'date', label: 'Fecha' },
                    { key: 'value', label },
                ]}
                rows={[...series].reverse().map((point) => ({
                    date: formatShortDateTime(point.measuredAt),
                    value: formatVitalSignValue(field, point.value),
                }))}
            />
        </>
    );
}
