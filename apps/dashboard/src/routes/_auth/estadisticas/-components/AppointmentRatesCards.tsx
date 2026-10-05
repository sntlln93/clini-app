import { KpiCard } from '@/features/charts/KpiCard';
import { formatNumber, formatPercent } from '@/lib/format';
import type { PlatformStats } from '@/types/stats';

/** Headline numbers; a rate with no denominator (e.g. no appointments) reads "—", never "0 %". */
export function AppointmentRatesCards({
    appointments,
}: {
    appointments: PlatformStats['appointments'];
}) {
    const { by_status: byStatus } = appointments;

    return (
        <section
            aria-label="Indicadores de turnos"
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
            <KpiCard
                title="Turnos en el período"
                value={formatNumber(appointments.total)}
                details={['Por fecha del turno']}
            />
            <KpiCard
                title="Tasa de cancelación"
                value={formatPercent(appointments.cancellation_rate)}
                details={[
                    `${formatNumber(byStatus.cancelled)} cancelados (sin contar reprogramados)`,
                ]}
            />
            <KpiCard
                title="Tasa de ausentismo"
                value={formatPercent(appointments.no_show_rate)}
                details={[
                    `${formatNumber(byStatus.no_show)} ausentes sobre los turnos que debían atenderse`,
                ]}
            />
        </section>
    );
}
