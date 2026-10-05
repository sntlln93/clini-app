import { NotFoundState } from '@/components/NotFoundState';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { requireSession } from '@/lib/auth-guards';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
    beforeLoad: ({ context, location }) =>
        requireSession({ ...context, location }),
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
        <DashboardLayout>
            <Outlet />
        </DashboardLayout>
    ),
});
