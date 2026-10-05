import { KpiCard } from '@/features/charts/KpiCard';
import { formatCurrencyARS, formatNumber } from '@/lib/format';
import type { OverviewKpis } from '@/types/overview';
import { SubscriptionStatusKpi } from './SubscriptionStatusKpi';

export function KpiGrid({ kpis }: { kpis: OverviewKpis }) {
    const { organizations, users, patients, appointments, mrr } = kpis;

    return (
        <section
            aria-label="Indicadores"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
            <KpiCard
                title="Organizaciones"
                value={formatNumber(organizations.total)}
                details={[
                    `${formatNumber(organizations.new_in_period)} nuevas en el período`,
                    `${formatNumber(organizations.suspended)} suspendidas`,
                ]}
            />
            <KpiCard
                title="Usuarios"
                value={formatNumber(users.total)}
                details={[
                    `${formatNumber(users.new_in_period)} nuevos en el período`,
                    `${formatNumber(users.verified)} verificados · ${formatNumber(users.blocked)} bloqueados`,
                ]}
            />
            <KpiCard
                title="Pacientes"
                value={formatNumber(patients.total)}
                details={[
                    `${formatNumber(patients.new_in_period)} nuevos en el período`,
                ]}
            />
            <KpiCard
                title="Turnos"
                value={formatNumber(appointments.total)}
                details={[
                    `${formatNumber(appointments.created_in_period)} creados en el período`,
                    `${formatNumber(appointments.upcoming)} próximos`,
                ]}
            />
            <KpiCard
                title="MRR estimado"
                value={formatCurrencyARS(mrr.amount, mrr.currency)}
                details={[
                    `${formatNumber(mrr.paying_subscriptions)} suscripciones pagas × ${formatCurrencyARS(mrr.plan_amount, mrr.currency)}`,
                ]}
                hint="Suscripciones activas y en gracia × precio del plan"
            />
            <SubscriptionStatusKpi counts={kpis.subscriptions} />
        </section>
    );
}
