import { CardSkeleton } from '@/components/CardSkeleton';
import { PublicLayout } from '@/layouts/PublicLayout';
import { createFileRoute } from '@tanstack/react-router';

/**
 * Public pages reachable with or without a session (online booking,
 * invitations): unlike `_public`, no `beforeLoad` sends a logged-in visitor
 * away. URLs are unchanged since the layout is pathless.
 */
export const Route = createFileRoute('/_open')({
    pendingComponent: () => (
        <div className="flex min-h-svh w-full items-center justify-center bg-background p-4">
            <CardSkeleton className="max-w-sm" />
        </div>
    ),
    component: PublicLayout,
});
