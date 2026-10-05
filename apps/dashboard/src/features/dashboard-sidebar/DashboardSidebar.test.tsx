import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { renderRoute } from '@/tests/render-route';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardSidebar } from './DashboardSidebar';
import { isNavItemActive } from './nav-items';

function renderSidebar(path: string) {
    return renderRoute(
        <TooltipProvider>
            <SidebarProvider>
                <DashboardSidebar />
            </SidebarProvider>
        </TooltipProvider>,
        { path },
    );
}

describe('DashboardSidebar', () => {
    it('lists the six sections in order', async () => {
        await renderSidebar('/');

        const nav = screen.getByRole('navigation', {
            name: 'Navegación principal',
        });
        const labels = within(nav)
            .getAllByRole('link')
            .map((link) => link.textContent);

        expect(labels).toEqual([
            'Resumen',
            'Organizaciones',
            'Usuarios',
            'Suscripciones',
            'Estadísticas',
            'Auditoría',
        ]);
    });

    it('marks the current section, including on a nested detail page', async () => {
        await renderSidebar('/organizaciones/12');

        const active = screen.getByRole('link', { current: 'page' });
        expect(active.textContent).toBe('Organizaciones');
        expect(
            screen
                .getByRole('link', { name: 'Resumen' })
                .getAttribute('aria-current'),
        ).toBeNull();
    });
});

describe('isNavItemActive', () => {
    it('only matches "/" on the overview itself', () => {
        expect(isNavItemActive('/', '/')).toBe(true);
        expect(isNavItemActive('/usuarios', '/')).toBe(false);
    });

    it('matches a section and its children, not a prefix-sharing sibling', () => {
        expect(isNavItemActive('/usuarios/3', '/usuarios')).toBe(true);
        expect(isNavItemActive('/usuariosx', '/usuarios')).toBe(false);
    });
});
