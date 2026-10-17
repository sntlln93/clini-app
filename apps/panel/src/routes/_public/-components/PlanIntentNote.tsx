import { PLAN_LABELS } from '@/lib/plan';
import type { PlanId } from '@/types/plan';

/**
 * The landing's slugs for the self-serve paid plans, as its CTAs link to
 * `/registro?plan=…`. Centro is assigned by the Clini team, never activated
 * from the panel, so it has none.
 */
export const PAID_PLAN_INTENTS = ['consultorio'] as const;

export type PaidPlanIntent = (typeof PAID_PLAN_INTENTS)[number];

const PLAN_IDS: Record<PaidPlanIntent, PlanId> = {
    consultorio: 'practice',
};

/**
 * A paid plan is activated from Ajustes, where the Mercado Pago checkout
 * lives, so every account starts on Free (#286): this tells a visitor who
 * picked one where to go once the practice is set up.
 */
export function PlanIntentNote({ plan }: { plan: PaidPlanIntent }) {
    const label = PLAN_LABELS[PLAN_IDS[plan]];

    return (
        <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            Tu cuenta empieza en el plan Gratis. Cuando termines de configurar
            el consultorio, activá {label} desde Ajustes › Plan y suscripción.
        </p>
    );
}
