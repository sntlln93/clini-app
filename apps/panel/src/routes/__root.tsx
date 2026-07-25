import { ThemeProvider } from '@/features/theme/ThemeProvider';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: () => (
        <ThemeProvider>
            <Outlet />
            {import.meta.env.DEV && <TanStackRouterDevtools />}
        </ThemeProvider>
    ),
});
