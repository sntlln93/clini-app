import { KpiCard } from '@/features/charts/KpiCard';
import type { OrganizationReport } from '@/types/report';
import { formatHours, formatPercent } from './report-format';
import { reportTotals } from './report-totals';

function plural(count: number, one: string, many: string): string {
    return `${count} ${count === 1 ? one : many}`;
}

/** Headline figures for the whole period. */
export function ReportSummaryCards({ report }: { report: OrganizationReport }) {
    const totals = reportTotals(report.series);

    return (
        <section
            aria-label="Resumen del período"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
            <KpiCard
                title="Ocupación"
                value={formatPercent(totals.occupancyRate)}
                details={[
                    `${formatHours(totals.bookedMinutes)} con turnos de ${formatHours(totals.publishedMinutes)} publicadas`,
                ]}
            />
            <KpiCard
                title="Ausentismo"
                value={formatPercent(totals.noShowRate)}
                details={[
                    `${plural(totals.noShow, 'ausente', 'ausentes')} de ${plural(totals.attended + totals.noShow, 'turno que llegó', 'turnos que llegaron')} a su hora`,
                ]}
            />
            <KpiCard
                title="Reservas online"
                value={formatPercent(totals.onlineRate)}
                details={[
                    `${totals.online} online · ${plural(totals.manual, 'cargada', 'cargadas')} en el panel`,
                ]}
            />
            {report.new_patients && (
                <KpiCard
                    title="Pacientes nuevos"
                    value={String(report.new_patients.total)}
                    details={['Registrados en la organización en el período']}
                />
            )}
        </section>
    );
}
