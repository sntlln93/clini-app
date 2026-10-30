import { useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChartDataTable } from '@/features/charts/ChartDataTable';
import { formatShortDateTime, fromInstant } from '@/lib/datetime';
import {
    formatVitalSignValue,
    seriesOf,
    TRACKED_FIELDS,
    VITAL_SIGN_FIELDS,
    type VitalSignField,
} from '@/lib/vital-signs';
import type { VitalSign } from '@/types/vital-sign';

const chartConfig = {
    value: { label: 'Valor', color: 'var(--chart-1)' },
} satisfies ChartConfig;

// The evolution of one followed value (#361): a line over the measurements
// that hold it, oldest first, and the same values as a table. Only the
// values some measurement holds are offered; annulled ones are left out.
export function VitalSignsEvolution({
    vitalSigns,
}: {
    vitalSigns: VitalSign[];
}) {
    const available = TRACKED_FIELDS.filter(
        (field) => seriesOf(vitalSigns, field).length > 0,
    );
    const [chosen, setChosen] = useState<VitalSignField | null>(null);
    const field =
        chosen !== null && available.includes(chosen) ? chosen : available[0];

    if (field === undefined) {
        return null;
    }

    const { label } = VITAL_SIGN_FIELDS[field];
    const series = seriesOf(vitalSigns, field);
    const items = available.map((key) => ({
        value: key,
        label: VITAL_SIGN_FIELDS[key].label,
    }));

    return (
        <section aria-label="Evolución" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Evolución</h3>
                <Select
                    items={items}
                    value={field}
                    onValueChange={(value) =>
                        value !== null && setChosen(value as VitalSignField)
                    }
                >
                    <SelectTrigger
                        aria-label="Dato"
                        className="w-full max-w-56"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {items.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
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
        </section>
    );
}
