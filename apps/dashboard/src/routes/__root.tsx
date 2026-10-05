import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import type { QueryClient } from '@tanstack/react-query';
import {
    createRootRouteWithContext,
    HeadContent,
    Outlet,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
    {
        component: () => (
            <ThemeProvider>
                {/* Client-only SPA: renders each route's `head` title, which React hoists into <head>. */}
                <HeadContent />
                <Outlet />
                <Toaster />
                {import.meta.env.DEV && <TanStackRouterDevtools />}
            </ThemeProvider>
        ),
    },
);
