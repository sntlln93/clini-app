import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/charts/ChartCard';
import { ChartDataTable } from '@/features/charts/ChartDataTable';
import { formatLocalDate, formatNumber, formatShortDay } from '@/lib/format';
import type { PlatformStats } from '@/types/stats';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartConfig = {
    count: { label: 'Pacientes nuevos', color: 'var(--chart-3)' },
} satisfies ChartConfig;

export function PatientsCard({
    patients,
}: {
    patients: PlatformStats['patients'];
}) {
    return (
        <ChartCard
            title="Pacientes nuevos"
            description={`${formatNumber(patients.new)} en el período.`}
            isEmpty={patients.new === 0}
        >
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-48 w-full"
            >
                <AreaChart
                    accessibilityLayer
                    data={patients.per_day}
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
                    <Area
                        dataKey="count"
                        type="monotone"
                        stroke="var(--color-count)"
                        strokeWidth={2}
                        fill="var(--color-count)"
                        fillOpacity={0.1}
                    />
                </AreaChart>
            </ChartContainer>
            <ChartDataTable
                caption="Pacientes nuevos por día"
                columns={[
                    { key: 'date', label: 'Fecha' },
                    { key: 'count', label: 'Pacientes nuevos' },
                ]}
                rows={patients.per_day.map((day) => ({
                    ...day,
                    date: formatLocalDate(day.date),
                }))}
            />
        </ChartCard>
    );
}
