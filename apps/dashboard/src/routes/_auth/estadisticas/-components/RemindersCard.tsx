import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { EMPTY_CHART_MESSAGE } from '@/features/charts/ChartCard';
import { formatNumber, formatPercent } from '@/lib/format';
import { REMINDER_CHANNEL_LABELS, REMINDER_STATUS_LABELS } from '@/lib/labels';
import { REMINDER_CHANNELS, type PlatformStats } from '@/types/stats';

// Delivery outcome first; "En cola" is a transient state, listed last.
const STATUS_ORDER = ['sent', 'failed', 'pending', 'queued'] as const;

export function RemindersCard({
    reminders,
}: {
    reminders: PlatformStats['reminders'];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recordatorios</CardTitle>
                <CardDescription>
                    Programados en el período · tasa de fallas{' '}
                    {formatPercent(reminders.failure_rate)}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {reminders.total === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {EMPTY_CHART_MESSAGE}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <CountList
                            title="Por estado"
                            rows={STATUS_ORDER.map((status) => [
                                REMINDER_STATUS_LABELS[status],
                                reminders.by_status[status],
                            ])}
                        />
                        <CountList
                            title="Por canal"
                            rows={REMINDER_CHANNELS.map((channel) => [
                                REMINDER_CHANNEL_LABELS[channel],
                                reminders.by_channel[channel],
                            ])}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function CountList({
    title,
    rows,
}: {
    title: string;
    rows: Array<[string, number]>;
}) {
    return (
        <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">
                {title}
            </p>
            <dl className="divide-y">
                {rows.map(([label, count]) => (
                    <div
                        key={label}
                        className="flex justify-between gap-4 py-1.5"
                    >
                        <dt>{label}</dt>
                        <dd className="font-medium tabular-nums">
                            {formatNumber(count)}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
