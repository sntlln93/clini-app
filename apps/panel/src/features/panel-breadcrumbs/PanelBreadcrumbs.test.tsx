import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PanelBreadcrumbs } from './PanelBreadcrumbs';

function renderBreadcrumbsAt(path: string) {
    const rootRoute = createRootRoute({
        component: () => (
            <>
                <PanelBreadcrumbs />
                <Outlet />
            </>
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
    render(<RouterProvider router={router} />);
}

describe('PanelBreadcrumbs', () => {
    it('renders the trail with intermediate links and the current page marked', async () => {
        renderBreadcrumbsAt('/pacientes/nuevo');

        const nav = await screen.findByRole('navigation', {
            name: 'Miga de pan',
        });
        expect(within(nav).getByRole('link', { name: 'Inicio' })).toBeTruthy();
        expect(
            within(nav).getByRole('link', { name: 'Pacientes' }),
        ).toBeTruthy();

        const current = within(nav).getByText('Nuevo paciente');
        expect(current.getAttribute('aria-current')).toBe('page');
        expect(current.tagName).not.toBe('A');
    });

    it('shows a single current-page crumb with no link at the root path', async () => {
        renderBreadcrumbsAt('/');

        const nav = await screen.findByRole('navigation', {
            name: 'Miga de pan',
        });
        const current = within(nav).getByText('Inicio');
        expect(current.getAttribute('aria-current')).toBe('page');
        expect(current.tagName).not.toBe('A');
        expect(current.getAttribute('href')).toBeNull();
    });

    it('renders Inicio as a real anchor pointing to /', async () => {
        renderBreadcrumbsAt('/agenda');

        const homeLink = await screen.findByRole('link', { name: 'Inicio' });
        expect(homeLink.tagName).toBe('A');
        expect(homeLink.getAttribute('href')).toBe('/');
    });

    describe('DOM structure', () => {
        it('no anida un `<li>` dentro de otro `<li>`', async () => {
            renderBreadcrumbsAt('/pacientes/nuevo');

            const nav = await screen.findByRole('navigation', {
                name: 'Miga de pan',
            });
            const items = nav.querySelectorAll('li');

            expect(items.length).toBeGreaterThan(0);
            items.forEach((li) => {
                expect(li.querySelector('li')).toBeNull();
            });
        });

        it('renderiza los separadores como hermanos de los items dentro del `<ol>`', async () => {
            renderBreadcrumbsAt('/pacientes/nuevo');

            const nav = await screen.findByRole('navigation', {
                name: 'Miga de pan',
            });
            const list = nav.querySelector('[data-slot="breadcrumb-list"]');

            expect(list).not.toBeNull();
            expect(list?.tagName).toBe('OL');

            const slots = Array.from(list?.children ?? []).map((child) =>
                child.getAttribute('data-slot'),
            );
            expect(slots).toEqual([
                'breadcrumb-item',
                'breadcrumb-separator',
                'breadcrumb-item',
                'breadcrumb-separator',
                'breadcrumb-item',
            ]);
        });

        it('no renderiza separador cuando hay una sola miga', async () => {
            renderBreadcrumbsAt('/');

            const nav = await screen.findByRole('navigation', {
                name: 'Miga de pan',
            });

            expect(
                nav.querySelectorAll('[data-slot="breadcrumb-item"]').length,
            ).toBe(1);
            expect(
                nav.querySelectorAll('[data-slot="breadcrumb-separator"]')
                    .length,
            ).toBe(0);
        });
    });
});
