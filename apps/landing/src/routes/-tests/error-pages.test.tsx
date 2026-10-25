import { expectNoA11yViolations } from '@/tests/a11y';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorRouterOptions } from '../-components/error-page/error-router-options';

// The site's own pages for a miss and for a failure, with the options the
// real router is built with (#304).
function renderAt(path: string) {
    const rootRoute = createRootRoute();
    const failingRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/falla',
        component: () => {
            throw new TypeError('x is undefined');
        },
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([failingRoute]),
        history: createMemoryHistory({ initialEntries: [path] }),
        ...errorRouterOptions,
    });

    return render(<RouterProvider router={router} />);
}

const CONTRAST_SKIP = {
    skip: [
        {
            id: 'color-contrast',
            reason: 'jsdom does not render pixels, so contrast cannot be computed.',
        },
    ],
};

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('error pages', () => {
    it('answers an unknown URL with the site page for a miss, without a11y violations', async () => {
        const { container } = renderAt('/no-existe');

        expect(
            await screen.findByRole('heading', {
                level: 1,
                name: 'No encontramos esta página',
            }),
        ).toBeTruthy();
        expect(screen.getByText('Error 404')).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'Escribinos' })
                .getAttribute('href'),
        ).toBe('/contacto');
        expect(
            document
                .querySelector('meta[name="robots"]')
                ?.getAttribute('content'),
        ).toBe('noindex');
        await expectNoA11yViolations(container, CONTRAST_SKIP);
    });

    it("shows its own page for a route that fails, not the router's English one", async () => {
        const { container } = renderAt('/falla');

        expect(
            await screen.findByRole('heading', {
                level: 1,
                name: 'Algo no salió como esperábamos',
            }),
        ).toBeTruthy();
        expect(screen.queryByText('Something went wrong!')).toBeNull();
        expect(screen.queryByText('x is undefined')).toBeNull();
        expect(
            screen
                .getByRole('link', { name: 'Reintentar' })
                .getAttribute('href'),
        ).toBe('/falla');
        await expectNoA11yViolations(container, CONTRAST_SKIP);
    });

    it('shows the exact error in debug mode', async () => {
        vi.stubEnv('VITE_APP_DEBUG', 'true');
        renderAt('/falla');

        expect(
            await screen.findByRole('heading', { name: 'x is undefined' }),
        ).toBeTruthy();
        expect(screen.getByText('TypeError')).toBeTruthy();
    });
});
