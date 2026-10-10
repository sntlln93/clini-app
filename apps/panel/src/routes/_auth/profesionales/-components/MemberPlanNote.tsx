import { PlanFeatureNote } from '@/features/plan-feature-note/PlanFeatureNote';
import { planIncludes, practiceMonthlyAmount, usePlan } from '@/lib/plan';
import { formatPesos } from '@/lib/price';
import type { MembershipRole } from '@/types/membership';

type MemberPlanNoteProps = {
    /** Roles the membership gains as active: every invited role, or what an edit adds or reactivates. */
    gainedRoles: MembershipRole[];
};

/**
 * What the plan means for an invitation or a member edit before saving it
 * (#237): Free's limits, or the new Consultorio amount when it adds a
 * professional past the included ones.
 */
export function MemberPlanNote({ gainedRoles }: MemberPlanNoteProps) {
    const plan = usePlan();

    if (!plan || gainedRoles.length === 0) {
        return null;
    }

    if (!planIncludes(plan, 'team')) {
        return (
            <PlanFeatureNote>
                El plan Gratis incluye un solo profesional y no incluye
                administración ni recepción.
            </PlanFeatureNote>
        );
    }

    const pricing = plan.practice_pricing;
    const nextCount = plan.active_professionals + 1;

    if (
        plan.plan !== 'practice' ||
        !gainedRoles.includes('professional') ||
        nextCount <= pricing.included_professionals
    ) {
        return null;
    }

    return (
        <p className="text-sm text-muted-foreground" role="status">
            Con este profesional, tu suscripción pasa a{' '}
            <span className="font-medium text-foreground">
                {formatPesos(practiceMonthlyAmount(pricing, nextCount))} por mes
            </span>{' '}
            desde el próximo cobro: {nextCount} profesionales activos, con{' '}
            {pricing.included_professionals} incluidos.
        </p>
    );
}
