import { PlanFeatureNote } from '@/features/plan-feature-note/PlanFeatureNote';
import { planIncludes, practiceMonthlyAmount, usePlan } from '@/lib/plan';
import { formatPesos } from '@/lib/price';
import type { MembershipRole } from '@/types/membership';

type InvitePlanNoteProps = {
    roles: MembershipRole[];
};

/**
 * What the plan means for this invitation (#237): Free's limits, or the new
 * Consultorio amount before inviting a professional past the included ones.
 */
export function InvitePlanNote({ roles }: InvitePlanNoteProps) {
    const plan = usePlan();

    if (!plan) {
        return null;
    }

    if (!planIncludes(plan, 'team')) {
        return (
            <PlanFeatureNote>
                El plan Gratis incluye un solo profesional y no permite invitar
                administración ni recepción.
            </PlanFeatureNote>
        );
    }

    const pricing = plan.practice_pricing;
    const nextCount = plan.active_professionals + 1;

    if (
        plan.plan !== 'practice' ||
        !roles.includes('professional') ||
        nextCount <= pricing.included_professionals
    ) {
        return null;
    }

    return (
        <p className="text-sm text-muted-foreground" role="status">
            Cuando acepte, tu suscripción pasa a{' '}
            <span className="font-medium text-foreground">
                {formatPesos(practiceMonthlyAmount(pricing, nextCount))} por mes
            </span>{' '}
            desde el próximo cobro: {nextCount} profesionales activos, con{' '}
            {pricing.included_professionals} incluidos.
        </p>
    );
}
