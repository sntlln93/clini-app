import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import {
    REGISTER_BILLING_SLUGS,
    REGISTER_BILLINGS,
} from './-components/RegisterBillingField';
import { RegisterForm } from './-components/RegisterForm';
import { REGISTER_PLANS } from './-components/RegisterPlanField';

// `plan`: the plan a landing CTA links with, preselected (#286), and `pago`
// how Consultorio is paid (#240). Any other value is dropped rather than
// failing the page.
const registroSearchSchema = z.object({
    plan: z.enum(REGISTER_PLANS).optional().catch(undefined),
    pago: z.enum(REGISTER_BILLING_SLUGS).optional().catch(undefined),
});

export const Route = createFileRoute('/_public/registro')({
    head: () => titleHead('Crear cuenta'),
    validateSearch: (search) => registroSearchSchema.parse(search),
    component: RegisterPage,
});

function RegisterPage() {
    const { plan, pago } = Route.useSearch();

    return (
        <div className="w-full max-w-sm">
            <RegisterForm
                plan={plan}
                billing={pago ? REGISTER_BILLINGS[pago] : undefined}
            />
        </div>
    );
}
