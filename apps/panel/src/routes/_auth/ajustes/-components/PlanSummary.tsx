import { PLAN_LABELS } from '@/lib/plan';
import type { Plan } from '@/types/plan';
import type { Subscription } from '@/types/subscription';
import { planDetail } from './plan-copy';

type PlanSummaryProps = {
    plan: Plan;
    subscription: Subscription | null;
};

/** The organization's current plan, what it includes and, on Consultorio, its monthly amount. */
export function PlanSummary({ plan, subscription }: PlanSummaryProps) {
    return (
        <div className="space-y-1 text-sm">
            <p>
                Plan actual:{' '}
                <span className="font-medium">{PLAN_LABELS[plan.plan]}</span>
            </p>
            <p className="text-muted-foreground">
                {planDetail(plan, subscription)}
            </p>
        </div>
    );
}
