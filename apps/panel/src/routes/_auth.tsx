import { NotFoundState } from '@/components/NotFoundState';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelLayout } from '@/layouts/PanelLayout';
import { requireSession } from '@/lib/auth-guards';
import { sessionQueryOptions } from '@/lib/session';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
    beforeLoad: ({ context, location }) =>
        requireSession({ ...context, location }),
    // Reads the subscription once for the whole panel (banner + read-only
    // affordances observe it via `useSubscription`). A user with no active
    // membership has no organization to ask about. A failed read is
    // swallowed on purpose: panel chrome must not take every page down, and
    // the backend still enforces the restriction on its own.
    loader: async ({ context }) => {
        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);

        if (!session.membership) {
            return;
        }

        try {
            // `revalidateIfStale` lets the staleTime take effect on
            // navigation: a stale cached value is returned at once and
            // refetched in the background, so the observers (banner,
            // read-only affordances) pick up a status changed server-side
            // (webhook, grace expiry) without a full reload.
            await context.queryClient.ensureQueryData({
                ...subscriptionQueryOptions,
                revalidateIfStale: true,
            });
        } catch {
            // See above.
        }
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
