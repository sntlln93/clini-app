import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

import { PanelBreadcrumbs } from '@/features/panel-breadcrumbs/PanelBreadcrumbs';
import { PanelHeader } from '@/features/panel-header/PanelHeader';
import { sessionQueryOptions } from '@/lib/session';
import { expectNoA11yViolations } from '../a11y';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

// PanelHeader renders ProfileMenu, which reads the signed-in user, so the
// session must be pre-seeded into the query cache.
function renderPanelChrome(path: string) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryOptions.queryKey, {
        id: 1,
        name: 'Ana Ejemplo',
        email: 'ana@clini.app',
        two_factor_enabled: false,
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <PanelHeader />
                <PanelBreadcrumbs />
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const paths = ['/agenda', '/pacientes', '/pacientes/nuevo'];
    const children = paths.map((p) =>
        createRoute({
            getParentRoute: () => rootRoute,
            path: p,
            component: () => null,
        }),
    );
    const routeTree = rootRoute.addChildren(children);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [path] }),
    });
    return render(<RouterProvider router={router} />);
}

describe('navigation a11y', () => {
    it('PanelHeader + ProfileMenu: the header navigation with the signed-in user has no violations', async () => {
        const { container } = renderPanelChrome('/pacientes');
        await expectNoA11yViolations(container);
    });

    it('PanelBreadcrumbs: a multi-level trail has no violations', async () => {
        const { container } = renderPanelChrome('/pacientes/nuevo');
        await expectNoA11yViolations(container);
    });
});
