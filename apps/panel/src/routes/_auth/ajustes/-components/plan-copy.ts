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

/** One or two sentences on what the current plan includes and, on Practice, what it costs this month. */
export function planDetail(
    plan: Plan,
    subscription: Subscription | null,
): string {
    switch (plan.plan) {
        case 'free':
            return `Incluye 1 profesional, reserva online, recordatorios por mail y notas clínicas. Consultorio suma equipo con roles, sala de espera, recetas y un link de reservas para cada profesional: ${practicePriceDetail(plan.practice_pricing)}.`;
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
