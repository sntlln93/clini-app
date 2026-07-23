import { ThemeProvider } from '@/features/theme/ThemeProvider';
import { PanelLayout } from '@/layouts/PanelLayout';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

export const Route = createRootRoute({
    component: () => (
        <ThemeProvider>
            <PanelLayout>
                <Outlet />
            </PanelLayout>
            {import.meta.env.DEV && <TanStackRouterDevtools />}
        </ThemeProvider>
    ),
});
