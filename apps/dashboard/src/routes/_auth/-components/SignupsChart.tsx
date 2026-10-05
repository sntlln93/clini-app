import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/charts/ChartCard';
import { ChartDataTable } from '@/features/charts/ChartDataTable';
import { isAllZero } from '@/features/charts/chart-data';
import { formatLocalDate, formatShortDay } from '@/lib/format';
import type { OverviewSeriesPoint } from '@/types/overview';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

const chartConfig = {
    organizations: { label: 'Organizaciones', color: 'var(--chart-1)' },
    users: { label: 'Usuarios', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/** "Altas por día": new organizations and new users per local day (two series, one axis). */
export function SignupsChart({ points }: { points: OverviewSeriesPoint[] }) {
    return (
        <ChartCard
            title="Altas por día"
            description="Organizaciones y usuarios creados cada día."
            isEmpty={isAllZero(points, ['organizations', 'users'])}
        >
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-64 w-full"
            >
                <LineChart
                    accessibilityLayer
                    data={points}
                    margin={{ left: 0, right: 12, top: 8 }}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={24}
                        tickFormatter={formatShortDay}
                    />
                    <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                    />
                    <ChartTooltip
                        content={
                            <ChartTooltipContent
                                indicator="line"
                                labelFormatter={(_, payload) =>
                                    formatLocalDate(
                                        String(payload?.[0]?.payload?.date),
                                    )
                                }
                            />
                        }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {(['organizations', 'users'] as const).map((key) => (
                        <Line
                            key={key}
                            dataKey={key}
                            type="monotone"
                            stroke={`var(--color-${key})`}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    ))}
                </LineChart>
            </ChartContainer>
            <ChartDataTable
                caption="Altas por día"
                columns={[
                    { key: 'date', label: 'Fecha' },
                    { key: 'organizations', label: 'Organizaciones' },
                    { key: 'users', label: 'Usuarios' },
                ]}
                rows={points.map((point) => ({
                    ...point,
                    date: formatLocalDate(point.date),
                }))}
            />
        </ChartCard>
    );
}
