import { Skeleton } from '@/components/ui/skeleton';
import { PublicLayout } from '@/layouts/PublicLayout';
import { redirectIfAuthenticated } from '@/lib/auth-guards';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_public')({
    beforeLoad: ({ context }) => redirectIfAuthenticated(context),
    pendingComponent: () => (
        <div className="flex min-h-svh w-full items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm space-y-3">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
            </div>
        </div>
    ),
    component: PublicLayout,
});
