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
import type { AppointmentsPerDay } from '@/types/stats';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartConfig = {
    online: { label: 'Online', color: 'var(--chart-1)' },
    manual: { label: 'Manual', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/** Appointments per scheduled day, stacked by origin (2px surface gap between the segments). */
export function AppointmentsPerDayChart({
    perDay,
}: {
    perDay: AppointmentsPerDay[];
}) {
    return (
        <ChartCard
            title="Turnos por día"
            description="Por fecha del turno, según cómo se reservó."
            isEmpty={isAllZero(perDay, ['total'])}
        >
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-64 w-full"
            >
                <BarChart
                    accessibilityLayer
                    data={perDay}
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
                        cursor={false}
                        content={
                            <ChartTooltipContent
                                labelFormatter={(_, payload) =>
                                    formatLocalDate(
                                        String(payload?.[0]?.payload?.date),
                                    )
                                }
                            />
                        }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                        dataKey="manual"
                        stackId="origin"
                        fill="var(--color-manual)"
                        stroke="var(--card)"
                        strokeWidth={2}
                        maxBarSize={24}
                    />
                    <Bar
                        dataKey="online"
                        stackId="origin"
                        fill="var(--color-online)"
                        stroke="var(--card)"
                        strokeWidth={2}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                    />
                </BarChart>
            </ChartContainer>
            <ChartDataTable
                caption="Turnos por día"
                columns={[
                    { key: 'date', label: 'Fecha' },
                    { key: 'online', label: 'Online' },
                    { key: 'manual', label: 'Manual' },
                    { key: 'total', label: 'Total' },
                ]}
                rows={perDay.map((day) => ({
                    ...day,
                    date: formatLocalDate(day.date),
                }))}
            />
        </ChartCard>
    );
}
