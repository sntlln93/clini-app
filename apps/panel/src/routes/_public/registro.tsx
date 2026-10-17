import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PAID_PLAN_INTENTS } from './-components/PlanIntentNote';
import { RegisterForm } from './-components/RegisterForm';

// `plan`: the paid plan a landing CTA links with (#286). Any other value is
// dropped rather than failing the page.
const registroSearchSchema = z.object({
    plan: z.enum(PAID_PLAN_INTENTS).optional().catch(undefined),
});

export const Route = createFileRoute('/_public/registro')({
    head: () => titleHead('Crear cuenta'),
    validateSearch: (search) => registroSearchSchema.parse(search),
    component: RegisterPage,
});

function RegisterPage() {
    const { plan } = Route.useSearch();

    return (
        <div className="w-full max-w-sm">
            <RegisterForm plan={plan} />
        </div>
    );
}
