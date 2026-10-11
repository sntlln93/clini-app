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
import type { ReportBucket, ReportGranularity } from '@/types/report';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { formatBucket, formatBucketRange } from './report-format';

const chartConfig = {
    online: { label: 'Online', color: 'var(--chart-1)' },
    manual: { label: 'En el panel', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/** Bookings per week or month, stacked by how they were made (2px surface gap between the segments). */
export function OriginChart({
    series,
    granularity,
}: {
    series: ReportBucket[];
    granularity: ReportGranularity;
}) {
    return (
        <ChartCard
            title="Reservas online y en el panel"
            description="Por fecha del turno. Una reprogramación cuenta una sola vez."
            isEmpty={isAllZero(series, ['online', 'manual'])}
        >
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-64 w-full"
            >
                <BarChart
                    accessibilityLayer
                    data={series}
                    margin={{ left: 0, right: 12, top: 8 }}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="start"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={16}
                        tickFormatter={(start: string) =>
                            formatBucket(start, granularity)
                        }
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
                                labelFormatter={(_, payload) => {
                                    const bucket = payload?.[0]?.payload as
                                        ReportBucket | undefined;

                                    return bucket
                                        ? formatBucketRange(
                                              bucket.start,
                                              bucket.end,
                                          )
                                        : '';
                                }}
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
                        maxBarSize={32}
                    />
                    <Bar
                        dataKey="online"
                        stackId="origin"
                        fill="var(--color-online)"
                        stroke="var(--card)"
                        strokeWidth={2}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                    />
                </BarChart>
            </ChartContainer>
            <ChartDataTable
                caption="Reservas online y en el panel"
                columns={[
                    { key: 'period', label: 'Período' },
                    { key: 'online', label: 'Online' },
                    { key: 'manual', label: 'En el panel' },
                ]}
                rows={series.map((bucket) => ({
                    period: formatBucketRange(bucket.start, bucket.end),
                    online: bucket.online,
                    manual: bucket.manual,
                }))}
            />
        </ChartCard>
    );
}
