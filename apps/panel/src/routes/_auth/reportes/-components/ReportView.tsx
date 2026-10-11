import type { Professional } from '@/types/professional';
import type { OrganizationReport } from '@/types/report';
import { NewPatientsChart } from './NewPatientsChart';
import { OriginChart } from './OriginChart';
import { ProfessionalsTable } from './ProfessionalsTable';
import { RateChart } from './RateChart';
import { formatLocalDate } from './report-format';
import { ReportFilters, type ReportFilterValues } from './ReportFilters';
import { ReportSummaryCards } from './ReportSummaryCards';

type ReportViewProps = {
    report: OrganizationReport;
    /** The roster to narrow by; empty for a professional who only sees their own report. */
    professionals: Professional[];
    membershipId: number | undefined;
    onFiltersChange: (patch: ReportFilterValues) => void;
};

export function ReportView({
    report,
    professionals,
    membershipId,
    onFiltersChange,
}: ReportViewProps) {
    const { period } = report;

    return (
        <div className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-3xl tracking-tight">Reportes</h1>
                <p className="text-base text-muted-foreground">
                    Del {formatLocalDate(period.from)} al{' '}
                    {formatLocalDate(period.to)}.
                </p>
            </header>

            <ReportFilters
                from={period.from}
                to={period.to}
                timezone={period.timezone}
                granularity={period.granularity}
                professionals={professionals}
                membershipId={membershipId}
                onChange={onFiltersChange}
            />

            <ReportSummaryCards report={report} />

            <ProfessionalsTable professionals={report.professionals} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <RateChart
                    title="Ocupación"
                    description="Horas con turnos sobre horas publicadas en la disponibilidad."
                    rateKey="occupancy_rate"
                    series={report.series}
                    granularity={period.granularity}
                />
                <RateChart
                    title="Ausentismo"
                    description="Ausentes sobre los turnos que llegaron a su hora."
                    rateKey="no_show_rate"
                    series={report.series}
                    granularity={period.granularity}
                />
                <OriginChart
                    series={report.series}
                    granularity={period.granularity}
                />
                {report.new_patients && (
                    <NewPatientsChart newPatients={report.new_patients} />
                )}
            </div>
        </div>
    );
}
