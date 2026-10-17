import { createFileRoute } from '@tanstack/react-router';
import { ContactPage } from './-components/ContactPage';
import { PLANS, type PlanId } from './-components/plans';

const TITLE = 'Contacto · Clini';
const DESCRIPTION =
    'Escribinos si te interesa el plan Centro o tenés dudas antes de empezar con Clini.';

const PLAN_IDS = new Set<string>(PLANS.map((plan) => plan.id));

/** `?plan=centro` preselects the plan the visitor came from; anything else is dropped. */
function isPlanId(value: unknown): value is PlanId {
    return typeof value === 'string' && PLAN_IDS.has(value);
}

export const Route = createFileRoute('/contacto')({
    validateSearch: (search: Record<string, unknown>): { plan?: PlanId } =>
        isPlanId(search.plan) ? { plan: search.plan } : {},
    head: () => ({
        meta: [
            { title: TITLE },
            { name: 'description', content: DESCRIPTION },
            { property: 'og:title', content: TITLE },
            { property: 'og:description', content: DESCRIPTION },
        ],
    }),
    component: ContactRoute,
});

function ContactRoute() {
    const { plan } = Route.useSearch();

    return <ContactPage plan={plan ?? null} />;
}
