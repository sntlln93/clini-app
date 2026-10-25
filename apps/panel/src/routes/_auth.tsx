import { Skeleton } from '@/components/ui/skeleton';
import { NotFoundState } from '@/features/error-page/NotFoundState';
import { PanelLayout } from '@/layouts/PanelLayout';
import { requireSession } from '@/lib/auth-guards';
import { setPracticeTimeZone } from '@/lib/datetime';
import { planQueryOptions } from '@/lib/plan';
import { sessionQueryOptions } from '@/lib/session';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
    // Before any guarded loader reads or builds a date (#265).
    beforeLoad: async ({ context, location }) => {
        const session = await requireSession({ ...context, location });
        setPracticeTimeZone(session.organization?.timezone);
    },
    // Reads the subscription and the plan once for the whole panel (banner,
    // read-only and per-plan affordances observe them via `useSubscription`
    // and `usePlan`). A user with no active membership has no organization
    // to ask about. A failed read is
    // swallowed on purpose: panel chrome must not take every page down, and
    // the backend still enforces the restriction on its own.
    loader: async ({ context }) => {
        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);

        if (!session.membership) {
            return;
        }

        // `revalidateIfStale` lets the staleTime take effect on navigation: a
        // stale cached value is returned at once and refetched in the
        // background, so the observers pick up a status changed server-side
        // (webhook, grace expiry, a membership change) without a full reload.
        await Promise.all([
            ensureSwallowingErrors(() =>
                context.queryClient.ensureQueryData({
                    ...planQueryOptions,
                    revalidateIfStale: true,
                }),
            ),
            ensureSwallowingErrors(() =>
                context.queryClient.ensureQueryData({
                    ...subscriptionQueryOptions,
                    revalidateIfStale: true,
                }),
            ),
        ]);
    },
    pendingComponent: () => (
        <div className="flex min-h-svh w-full items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-3">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
            </div>
        </div>
    ),
    // For a `notFound()` thrown by a child page; unknown URLs hit the `$` splat route.
    notFoundComponent: NotFoundState,
    component: () => (
        <PanelLayout>
            <Outlet />
        </PanelLayout>
    ),
});

/** See the loader: a failed panel-wide read never takes the page down. */
async function ensureSwallowingErrors(read: () => Promise<unknown>) {
    try {
        await read();
    } catch {
        // Swallowed on purpose.
    }
}
