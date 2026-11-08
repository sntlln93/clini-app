import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { invoicesQueryOptions } from '@/lib/invoices';
import { titleHead } from '@/lib/page-title';
import { planQueryOptions, usePlan } from '@/lib/plan';
import { sessionQueryOptions } from '@/lib/session';
import { subscriptionQueryOptions, useSubscription } from '@/lib/subscription';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { InvoicesSection } from './-components/InvoicesSection';
import { SubscriptionSection } from './-components/SubscriptionSection';
import { useCheckoutReturn } from './-hooks/use-checkout-return';

// `retorno`: the browser is back from the Mercado Pago checkout (the API's
// return route). Any other value is dropped rather than failing the page.
const subscriptionSearchSchema = z.object({
    suscripcion: z.literal('retorno').optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/ajustes/suscripcion')({
    head: () => titleHead('Plan y suscripción', 'Ajustes'),
    validateSearch: (search) => subscriptionSearchSchema.parse(search),
    loader: async ({ context }) => {
        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);

        // No active membership means no organization to bill.
        if (!session.membership) {
            throw redirect({ to: '/ajustes', replace: true });
        }

        const isOwner = (session.roles ?? []).includes('owner');
        const [subscription, plan, invoices] = await Promise.all([
            context.queryClient.ensureQueryData({
                ...subscriptionQueryOptions,
                revalidateIfStale: true,
            }),
            context.queryClient.ensureQueryData({
                ...planQueryOptions,
                revalidateIfStale: true,
            }),
            // The invoices are the owner's alone (#246): nobody else asks.
            isOwner
                ? context.queryClient.ensureQueryData({
                      ...invoicesQueryOptions,
                      revalidateIfStale: true,
                  })
                : Promise.resolve([]),
        ]);

        return { subscription, plan, invoices, isOwner };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: SuscripcionPage,
});

function SuscripcionPage() {
    const {
        subscription: loaderSubscription,
        plan: loaderPlan,
        invoices,
        isOwner,
    } = Route.useLoaderData();
    // The loader may resolve with a stale cached value while it revalidates
    // in the background; observing the cache keeps this section in sync with
    // the banner once that refetch lands.
    const liveSubscription = useSubscription();
    const subscription =
        liveSubscription !== undefined ? liveSubscription : loaderSubscription;
    const plan = usePlan() ?? loaderPlan;
    const { suscripcion } = Route.useSearch();
    const confirmingPayment = useCheckoutReturn(
        suscripcion === 'retorno',
        subscription?.status === 'pending',
    );

    return (
        <div className="space-y-8">
            <SubscriptionSection
                subscription={subscription}
                plan={plan}
                isOwner={isOwner}
                confirmingPayment={confirmingPayment}
            />
            {/* A practice that never paid through the panel (Free, or Centro, billed outside it) has nothing to list. */}
            {isOwner && (subscription !== null || invoices.length > 0) && (
                <InvoicesSection invoices={invoices} />
            )}
        </div>
    );
}
