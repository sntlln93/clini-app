import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import { planQueryOptions, usePlan } from '@/lib/plan';
import { sessionQueryOptions } from '@/lib/session';
import { subscriptionQueryOptions, useSubscription } from '@/lib/subscription';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
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

        const [subscription, plan] = await Promise.all([
            context.queryClient.ensureQueryData({
                ...subscriptionQueryOptions,
                revalidateIfStale: true,
            }),
            context.queryClient.ensureQueryData({
                ...planQueryOptions,
                revalidateIfStale: true,
            }),
        ]);

        return {
            subscription,
            plan,
            isOwner: (session.roles ?? []).includes('owner'),
        };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: SuscripcionPage,
});

function SuscripcionPage() {
    const {
        subscription: loaderSubscription,
        plan: loaderPlan,
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
        <SubscriptionSection
            subscription={subscription}
            plan={plan}
            isOwner={isOwner}
            confirmingPayment={confirmingPayment}
        />
    );
}
