import { Skeleton } from '@/components/ui/skeleton';
import { useRouteFocus } from '@/hooks/use-route-focus';
import { redirectIfAuthenticated } from '@/lib/auth-guards';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useRef } from 'react';

export function PublicLayout() {
    const containerRef = useRef<HTMLElement>(null);
    useRouteFocus(containerRef);

    return (
        <main
            ref={containerRef}
            tabIndex={-1}
            className="flex min-h-svh w-full items-center justify-center bg-background p-4"
        >
            <Outlet />
        </main>
    );
}

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
