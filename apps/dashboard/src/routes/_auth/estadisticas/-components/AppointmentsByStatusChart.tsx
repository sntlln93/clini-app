import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/charts/ChartCard';
import { ChartDataTable } from '@/features/charts/ChartDataTable';
import { APPOINTMENT_STATUS_COLORS } from '@/lib/appointment-status-colors';
import { APPOINTMENT_STATUS_LABELS } from '@/lib/labels';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '@/types/stats';
import {
    Bar,
    BarChart,
    LabelList,
    Rectangle,
    XAxis,
    YAxis,
    type BarShapeProps,
} from 'recharts';

type StatusRow = { key: AppointmentStatus; status: string; count: number };

const chartConfig = {
    count: { label: 'Turnos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/** One measure across statuses: each bar in its status color (as in the panel's agenda), value at each bar tip. */
export function AppointmentsByStatusChart({
    byStatus,
}: {
    byStatus: Record<AppointmentStatus, number>;
}) {
    const rows: StatusRow[] = APPOINTMENT_STATUSES.map((status) => ({
        key: status,
        status: APPOINTMENT_STATUS_LABELS[status],
        count: byStatus[status],
    }));

    return (
        <ChartCard
            title="Turnos por estado"
            isEmpty={rows.every((row) => row.count === 0)}
        >
            <ChartContainer
                config={chartConfig}
                className="aspect-auto h-72 w-full"
            >
                <BarChart
                    accessibilityLayer
                    data={rows}
                    layout="vertical"
                    margin={{ left: 8, right: 40 }}
                >
                    <YAxis
                        dataKey="status"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={96}
                    />
                    <XAxis
                        type="number"
                        dataKey="count"
                        hide
                        allowDecimals={false}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel={false} />}
                    />
                    <Bar
                        dataKey="count"
                        fill="var(--color-count)"
                        shape={(props: BarShapeProps) => (
                            <Rectangle
                                x={props.x}
                                y={props.y}
                                width={props.width}
                                height={props.height}
                                radius={props.radius}
                                fill={
                                    APPOINTMENT_STATUS_COLORS[
                                        (props.payload as StatusRow).key
                                    ]
                                }
                            />
                        )}
                        radius={[0, 4, 4, 0]}
                        maxBarSize={24}
                    >
                        <LabelList
                            dataKey="count"
                            position="right"
                            className="fill-foreground tabular-nums"
                            fontSize={12}
                        />
                    </Bar>
                </BarChart>
            </ChartContainer>
            <ChartDataTable
                caption="Turnos por estado"
                columns={[
                    { key: 'status', label: 'Estado' },
                    { key: 'count', label: 'Turnos' },
                ]}
                rows={rows}
            />
        </ChartCard>
    );
}
