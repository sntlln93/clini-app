import { ChartCard } from '@/features/charts/ChartCard';
import { formatNumber, formatPercent } from '@/lib/format';
import { APPOINTMENT_ORIGIN_LABELS } from '@/lib/labels';
import { APPOINTMENT_ORIGINS, type AppointmentOrigin } from '@/types/stats';

const ORIGIN_COLORS: Record<AppointmentOrigin, string> = {
    online: 'var(--chart-1)',
    manual: 'var(--chart-2)',
};

/** Part-to-whole of two values: one segmented bar with a labelled legend (count + share), no pie. */
export function AppointmentsByOriginChart({
    byOrigin,
}: {
    byOrigin: Record<AppointmentOrigin, number>;
}) {
    const total = byOrigin.online + byOrigin.manual;

    return (
        <ChartCard
            title="Turnos por origen"
            description="Reservas online de pacientes frente a turnos cargados por el consultorio."
            isEmpty={total === 0}
        >
            <div className="space-y-4">
                <div
                    className="flex h-6 w-full gap-0.5 overflow-hidden rounded-md"
                    aria-hidden="true"
                >
                    {APPOINTMENT_ORIGINS.filter(
                        (origin) => byOrigin[origin] > 0,
                    ).map((origin) => (
                        <div
                            key={origin}
                            className="h-full first:rounded-l-md last:rounded-r-md"
                            style={{
                                width: `${(byOrigin[origin] / total) * 100}%`,
                                backgroundColor: ORIGIN_COLORS[origin],
                            }}
                            title={`${APPOINTMENT_ORIGIN_LABELS[origin]}: ${formatNumber(byOrigin[origin])}`}
                        />
                    ))}
                </div>
                <ul className="flex flex-wrap gap-x-6 gap-y-2">
                    {APPOINTMENT_ORIGINS.map((origin) => (
                        <li key={origin} className="flex items-center gap-2">
                            <span
                                className="size-2.5 shrink-0 rounded-xs"
                                style={{
                                    backgroundColor: ORIGIN_COLORS[origin],
                                }}
                                aria-hidden="true"
                            />
                            <span>{APPOINTMENT_ORIGIN_LABELS[origin]}</span>
                            <span className="font-medium tabular-nums">
                                {formatNumber(byOrigin[origin])}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                                ({formatPercent(byOrigin[origin] / total)})
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </ChartCard>
    );
}
