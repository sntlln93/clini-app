import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Route as VerifyEmailTokenRouteImport } from '../verificar-email.$token';

// The landmark assertion needs neither the card's behavior nor any HTTP —
// stub it out so the route under test doesn't have to mock `@/lib/api`.
vi.mock('../-components/VerifyEmailCard', () => ({
    VerifyEmailCard: () => <div>Tarjeta de verificación</div>,
}));

const TOKEN = 'abc123';

// `VerifyEmailPage` reads its token via `Route.useParams()` on its own file
// route, so the real exported `Route` is assembled into a memory router the
// same way `routeTree.gen.ts` does, rather than rendering the component
// standalone without router context.
function renderVerifyEmailPage() {
    const rootRoute = createRootRoute();
    const verifyEmailRoute = VerifyEmailTokenRouteImport.update({
        id: '/verificar-email/$token',
        path: '/verificar-email/$token',
        getParentRoute: () => rootRoute,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors routeTree.gen.ts's own `.update()` call
    } as any);
    const routeTree = rootRoute.addChildren([verifyEmailRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({
            initialEntries: [`/verificar-email/${TOKEN}`],
        }),
    });

    render(<RouterProvider router={router} />);
}

describe('VerifyEmailPage', () => {
    it('renders a main landmark', async () => {
        renderVerifyEmailPage();

        expect(await screen.findByRole('main')).not.toBeNull();
    });
});
