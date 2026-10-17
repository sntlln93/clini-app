import { PlanFeatureNote } from '@/features/plan-feature-note/PlanFeatureNote';
import {
    billingPeriodLabel,
    planIncludes,
    practiceAmount,
    usePlan,
} from '@/lib/plan';
import { formatPesos } from '@/lib/price';
import { chargingBilling, useSubscription } from '@/lib/subscription';
import type { MembershipRole } from '@/types/membership';

type MemberPlanNoteProps = {
    /** Roles the membership gains as active: every invited role, or what an edit adds or reactivates. */
    gainedRoles: MembershipRole[];
};

/**
 * What the plan means for an invitation or a member edit before saving it
 * (#237): Free's limits, or the new Consultorio amount when it adds a
 * professional past the included ones — per year on annual billing, from
 * its next yearly renewal (#240).
 */
export function MemberPlanNote({ gainedRoles }: MemberPlanNoteProps) {
    const plan = usePlan();
    const billing = chargingBilling(useSubscription());

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
                {formatPesos(practiceAmount(pricing, nextCount, billing))}{' '}
                {billingPeriodLabel(billing)}
            </span>{' '}
            {billing === 'annual'
                ? 'desde la próxima renovación anual'
                : 'desde el próximo cobro'}
            : {nextCount} profesionales activos, con{' '}
            {pricing.included_professionals} incluidos.
        </p>
    );
}
