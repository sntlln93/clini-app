import { practiceMonthlyAmount } from '@/lib/plan';
import { formatPesos } from '@/lib/price';
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
            const amount =
                subscription?.amount ??
                practiceMonthlyAmount(
                    plan.practice_pricing,
                    plan.active_professionals,
                );

            return `Tu suscripción es de ${formatPesos(amount)} por mes, con ${professionalsLabel(plan.active_professionals)}: ${practicePriceDetail(plan.practice_pricing)}.`;
        }
        case 'center':
            return 'El plan Centro lo gestiona el equipo de Clini: sin límite de profesionales y con todas las funciones del panel.';
    }
}
