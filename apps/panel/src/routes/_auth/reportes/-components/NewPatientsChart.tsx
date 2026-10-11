import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/charts/ChartCard';
import { ChartDataTable } from '@/features/charts/ChartDataTable';
import { isAllZero } from '@/features/charts/chart-data';
import type { OrganizationReport } from '@/types/report';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { formatMonth } from './report-format';

const chartConfig = {
    count: { label: 'Pacientes nuevos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

type NewPatientsChartProps = {
    newPatients: NonNullable<OrganizationReport['new_patients']>;
};

/** Patients registered in the organization, per calendar month. */
export function NewPatientsChart({ newPatients }: NewPatientsChartProps) {
    const perMonth = newPatients.per_month;

    return (
        <ChartCard
            title="Pacientes nuevos por mes"
            description="Según la fecha en que se registraron en la organización."
            isEmpty={isAllZero(perMonth, ['count'])}
        >
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-64 w-full"
            >
                <BarChart
                    responsive
                    accessibilityLayer
                    data={perMonth}
                    margin={{ left: 0, right: 12, top: 8 }}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={formatMonth}
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
                                    formatMonth(
                                        String(payload?.[0]?.payload?.month),
                                    )
                                }
                            />
                        }
                    />
                    <Bar
                        dataKey="count"
                        fill="var(--color-count)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                    />
                </BarChart>
            </ChartContainer>
            <ChartDataTable
                caption="Pacientes nuevos por mes"
                columns={[
                    { key: 'month', label: 'Mes' },
                    { key: 'count', label: 'Pacientes nuevos' },
                ]}
                rows={perMonth.map((month) => ({
                    month: formatMonth(month.month),
                    count: month.count,
                }))}
            />
        </ChartCard>
    );
}
