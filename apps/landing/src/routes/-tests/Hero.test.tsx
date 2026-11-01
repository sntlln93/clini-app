import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// #249: the booking link example shows the panel's real host, the same
// `<host>/reservar/<slug>` the panel gives the professional.
async function renderHero(panelUrl: string) {
    vi.stubEnv('VITE_PANEL_URL', panelUrl);
    vi.resetModules();
    const { Hero } = await import('../-components/Hero');

    return render(<Hero />);
}

function bookingLink(container: HTMLElement) {
    return container.querySelector('code')?.textContent;
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Hero', () => {
    it("shows the booking link on the panel's host", async () => {
        const { container } = await renderHero('https://panel.clini.example/');

        expect(bookingLink(container)).toBe(
            'panel.clini.example/reservar/consultorio-belgrano',
        );
    });

    it('keeps an ellipsis without the panel URL', async () => {
        const { container } = await renderHero('');

        expect(bookingLink(container)).toBe('…/reservar/consultorio-belgrano');
    });
});
