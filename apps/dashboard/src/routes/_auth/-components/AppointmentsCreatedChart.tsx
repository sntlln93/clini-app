import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/charts/ChartCard';
import { ChartDataTable } from '@/features/charts/ChartDataTable';
import { isAllZero } from '@/features/charts/chart-data';
import { formatLocalDate, formatShortDay } from '@/lib/format';
import type { OverviewSeriesPoint } from '@/types/overview';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartConfig = {
    appointments: { label: 'Turnos creados', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/** "Turnos creados por día": a single series, so no legend box — the title names it. */
export function AppointmentsCreatedChart({
    points,
}: {
    points: OverviewSeriesPoint[];
}) {
    return (
        <ChartCard
            title="Turnos creados por día"
            description="Turnos cargados en la plataforma cada día (manuales y online)."
            isEmpty={isAllZero(points, ['appointments'])}
        >
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-64 w-full"
            >
                <BarChart
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
                    <Bar
                        dataKey="appointments"
                        fill="var(--color-appointments)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                    />
                </BarChart>
            </ChartContainer>
            <ChartDataTable
                caption="Turnos creados por día"
                columns={[
                    { key: 'date', label: 'Fecha' },
                    { key: 'appointments', label: 'Turnos creados' },
                ]}
                rows={points.map((point) => ({
                    date: formatLocalDate(point.date),
                    appointments: point.appointments,
                }))}
            />
        </ChartCard>
    );
}
