import {
    Sidebar,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

const ORIGINAL_INNER_WIDTH = window.innerWidth;

function setViewportWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
    });
}

afterEach(() => {
    setViewportWidth(ORIGINAL_INNER_WIDTH);
});

function renderSidebar(side?: 'left' | 'right') {
    render(
        <SidebarProvider>
            <SidebarTrigger />
            <Sidebar side={side}>
                <div>Contenido de la sidebar</div>
            </Sidebar>
        </SidebarProvider>,
    );
}

function openMobileDrawer() {
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
}

describe('Sidebar mobile drawer', () => {
    it('opens from the bottom on a mobile viewport', () => {
        setViewportWidth(375);
        renderSidebar();
        openMobileDrawer();

        const drawer = document.querySelector('[data-mobile="true"]');
        expect(drawer).not.toBeNull();
        expect(drawer?.getAttribute('data-side')).toBe('bottom');
    });

    it('does not let the desktop side prop leak into the mobile drawer', () => {
        setViewportWidth(375);
        renderSidebar('right');
        openMobileDrawer();

        const drawer = document.querySelector('[data-mobile="true"]');
        expect(drawer?.getAttribute('data-side')).toBe('bottom');
    });

    it('caps the drawer height and drops the fixed desktop width', () => {
        setViewportWidth(375);
        renderSidebar();
        openMobileDrawer();

        const drawer = document.querySelector('[data-mobile="true"]');
        const classes = drawer?.className.split(' ') ?? [];
        expect(classes).toContain('max-h-[80svh]');
        expect(classes).not.toContain('w-(--sidebar-width)');
    });

    it('lets the inner wrapper shrink so the nav can scroll internally', () => {
        setViewportWidth(375);
        renderSidebar();
        openMobileDrawer();

        // jsdom performs no layout, so the class contract (min-h-0 alongside
        // flex-col) is the assertable proxy for "this wrapper can shrink
        // below its content height so the nav scrolls inside it".
        const drawer = document.querySelector('[data-mobile="true"]');
        const shrinkWrapper = drawer?.querySelector('.min-h-0.flex-col');
        expect(shrinkWrapper).not.toBeNull();
    });

    it('closes on Escape', async () => {
        setViewportWidth(375);
        renderSidebar();
        openMobileDrawer();
        expect(document.querySelector('[data-mobile="true"]')).not.toBeNull();

        fireEvent.keyDown(document, { key: 'Escape' });

        await waitFor(() => {
            expect(document.querySelector('[data-mobile="true"]')).toBeNull();
        });
    });
});

describe('Sidebar desktop container', () => {
    it('renders the fixed desktop container instead of the mobile drawer, honoring the side prop', () => {
        setViewportWidth(1024);
        const { rerender } = render(
            <SidebarProvider>
                <Sidebar side="left">
                    <div>Contenido de la sidebar</div>
                </Sidebar>
            </SidebarProvider>,
        );

        expect(document.querySelector('[data-mobile="true"]')).toBeNull();
        let container = document.querySelector(
            '[data-slot="sidebar-container"]',
        );
        expect(container?.getAttribute('data-side')).toBe('left');

        rerender(
            <SidebarProvider>
                <Sidebar side="right">
                    <div>Contenido de la sidebar</div>
                </Sidebar>
            </SidebarProvider>,
        );

        container = document.querySelector('[data-slot="sidebar-container"]');
        expect(container?.getAttribute('data-side')).toBe('right');
    });
});
