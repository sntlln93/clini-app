import { billingPeriodLabel, practiceAmount } from '@/lib/plan';
import { formatPesos } from '@/lib/price';
import { chargingBilling } from '@/lib/subscription';
import type { Plan } from '@/types/plan';
import type { Subscription } from '@/types/subscription';

/** «$ 15.000 por mes con 5 profesionales incluidos y $ 5.000 por cada profesional adicional». */
export function practicePriceDetail(pricing: Plan['practice_pricing']): string {
    const base = `${formatPesos(pricing.base_amount)} por mes con ${pricing.included_professionals} profesionales incluidos`;

    return pricing.extra_professional_amount > 0
        ? `${base} y ${formatPesos(pricing.extra_professional_amount)} por cada profesional adicional`
        : base;
}

function professionalsLabel(count: number): string {
    return count === 1
        ? '1 profesional activo'
        : `${count} profesionales activos`;
}

/** Free's monthly appointments: the configured limit, or none (#300). */
function appointmentsLabel(limit: number | null): string {
    return limit === null
        ? 'turnos sin límite'
        : `hasta ${limit} turnos por mes`;
}

/** One or two sentences on what the current plan includes and, on Practice, what it costs this month. */
export function planDetail(
    plan: Plan,
    subscription: Subscription | null,
): string {
    switch (plan.plan) {
        case 'free':
            return `Incluye 1 profesional, ${appointmentsLabel(plan.appointment_limit)}, reserva online, recordatorios por mail y notas clínicas. Consultorio suma equipo con roles, sala de espera, recetas, un link de reservas para cada profesional y tu logo en la página de reservas, sin «Hecho con Clini»: ${practicePriceDetail(plan.practice_pricing)}.`;
        case 'practice': {
            const billing = chargingBilling(subscription);
            // An unpaid checkout's stored amount isn't what is being charged.
            const stored =
                subscription?.billing === billing ? subscription.amount : null;
            const amount =
                stored ??
                practiceAmount(
                    plan.practice_pricing,
                    plan.active_professionals,
                    billing,
                );
            const detail = `Tu suscripción es de ${formatPesos(amount)} ${billingPeriodLabel(billing)}, con ${professionalsLabel(plan.active_professionals)}: ${practicePriceDetail(plan.practice_pricing)}`;

            // A yearly charge is repriced only at its next renewal, never prorated (#240).
            return billing === 'annual'
                ? `${detail}, con ${plan.practice_pricing.annual_discount_percent}% de descuento por pagar el año. Si cambian los profesionales, el monto nuevo rige desde la próxima renovación.`
                : `${detail}.`;
        }
        case 'center':
            return 'El plan Centro lo gestiona el equipo de Clini: sin límite de profesionales y con todas las funciones del panel.';
    }
}
