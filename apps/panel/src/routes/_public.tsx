import { CardSkeleton } from '@/components/CardSkeleton';
import { PublicLayout } from '@/layouts/PublicLayout';
import { redirectIfAuthenticated } from '@/lib/auth-guards';
import { createFileRoute } from '@tanstack/react-router';

/** Login and registration only: a signed-in visitor has nothing to do here, so it's sent on. Pages that must open either way live under `_open`. */
export const Route = createFileRoute('/_public')({
    beforeLoad: ({ context, location }) =>
        redirectIfAuthenticated({ ...context, location }),
    pendingComponent: () => (
        <div className="flex min-h-svh w-full items-center justify-center bg-background p-4">
            <CardSkeleton className="max-w-sm" />
        </div>
    ),
    component: PublicLayout,
});
