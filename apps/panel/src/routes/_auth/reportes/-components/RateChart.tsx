import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/charts/ChartCard';
import { ChartDataTable } from '@/features/charts/ChartDataTable';
import type { ReportBucket, ReportGranularity } from '@/types/report';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
    formatBucket,
    formatBucketRange,
    formatPercent,
} from './report-format';

type RateChartProps = {
    title: string;
    description: string;
    /** Which 0..1 rate of each bucket to plot. */
    rateKey: 'occupancy_rate' | 'no_show_rate';
    series: ReportBucket[];
    granularity: ReportGranularity;
};

/** A rate per week or month; a bucket without a denominator has no bar. */
export function RateChart({
    title,
    description,
    rateKey,
    series,
    granularity,
}: RateChartProps) {
    const chartConfig = {
        [rateKey]: { label: title, color: 'var(--chart-1)' },
    } satisfies ChartConfig;

    return (
        <ChartCard
            title={title}
            description={description}
            isEmpty={series.every((bucket) => bucket[rateKey] === null)}
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
                        domain={[0, 1]}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tickFormatter={(rate: number) => formatPercent(rate)}
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
                                formatter={(value) => (
                                    <span className="flex w-full justify-between gap-4">
                                        <span className="text-muted-foreground">
                                            {title}
                                        </span>
                                        <span className="font-mono font-medium text-foreground tabular-nums">
                                            {formatPercent(Number(value))}
                                        </span>
                                    </span>
                                )}
                            />
                        }
                    />
                    <Bar
                        dataKey={rateKey}
                        fill={`var(--color-${rateKey})`}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                    />
                </BarChart>
            </ChartContainer>
            <ChartDataTable
                caption={title}
                columns={[
                    { key: 'period', label: 'Período' },
                    { key: 'rate', label: title },
                ]}
                rows={series.map((bucket) => ({
                    period: formatBucketRange(bucket.start, bucket.end),
                    rate: formatPercent(bucket[rateKey]),
                }))}
            />
        </ChartCard>
    );
}
