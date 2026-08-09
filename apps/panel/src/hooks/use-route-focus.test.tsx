import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { useRouteFocus } from './use-route-focus';

const searchSchema = z.object({ foo: z.string().optional() });

// The ref-bearing container lives on the persistent root layout (mirroring
// `PanelLayout`/`_public.tsx`), so the hook's instance survives navigation instead of remounting.
function TestLayout() {
    const ref = useRef<HTMLDivElement>(null);
    useRouteFocus(ref);

    return (
        <div ref={ref} data-testid="target" tabIndex={-1}>
            <Outlet />
        </div>
    );
}

function renderRouteFocusHarness(initialEntry: string) {
    const rootRoute = createRootRoute({ component: TestLayout });
    const routeA = createRoute({
        getParentRoute: () => rootRoute,
        path: '/a',
        validateSearch: searchSchema,
        component: () => <div>A</div>,
    });
    const routeB = createRoute({
        getParentRoute: () => rootRoute,
        path: '/b',
        validateSearch: searchSchema,
        component: () => <div>B</div>,
    });
    const routeTree = rootRoute.addChildren([routeA, routeB]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [initialEntry] }),
    });

    render(<RouterProvider router={router} />);

    return router;
}

describe('useRouteFocus', () => {
    it('does not focus on the initial mount', async () => {
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');

        renderRouteFocusHarness('/a');
        const target = await screen.findByTestId('target');

        expect(focusSpy).not.toHaveBeenCalled();
        expect(document.activeElement).not.toBe(target);
    });

    it('moves focus to the container when the pathname changes', async () => {
        const router = renderRouteFocusHarness('/a');
        const target = await screen.findByTestId('target');

        // Cast to `any`: this standalone test router isn't the app's registered one.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
        await router.navigate({ to: '/b' } as any);

        expect(document.activeElement).toBe(target);
    });

    it('focuses with preventScroll: true', async () => {
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
        const router = renderRouteFocusHarness('/a');
        await screen.findByTestId('target');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
        await router.navigate({ to: '/b' } as any);

        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('does not move focus when only search params change', async () => {
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
        const router = renderRouteFocusHarness('/a');
        await screen.findByTestId('target');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
        await router.navigate({ to: '/a', search: { foo: 'bar' } } as any);

        expect(focusSpy).not.toHaveBeenCalled();
    });

    it('focuses exactly once per navigation', async () => {
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
        const router = renderRouteFocusHarness('/a');
        await screen.findByTestId('target');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
        await router.navigate({ to: '/b' } as any);
        // Same pathname, different search must not produce a second focus call.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
        await router.navigate({ to: '/b', search: { foo: 'baz' } } as any);

        expect(focusSpy).toHaveBeenCalledTimes(1);
    });
});
