import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListSkeleton } from './ListSkeleton';

describe('ListSkeleton', () => {
    it('renders a status role region announcing Cargando…', () => {
        render(<ListSkeleton />);

        const status = screen.getByRole('status');

        expect(status).not.toBeNull();
        expect(status.textContent).toContain('Cargando…');
    });

    it('with default props renders 3 skeleton bars', () => {
        const { container } = render(<ListSkeleton />);

        expect(
            container.querySelectorAll('[data-slot="skeleton"]'),
        ).toHaveLength(3);
    });

    it('with rows=1 renders 1 skeleton bar', () => {
        const { container } = render(<ListSkeleton rows={1} />);

        expect(
            container.querySelectorAll('[data-slot="skeleton"]'),
        ).toHaveLength(1);
    });

    it('keeps the bars inside the aria-hidden container', () => {
        const { container } = render(<ListSkeleton />);

        const hiddenContainer = container.querySelector('[aria-hidden="true"]');
        expect(hiddenContainer).not.toBeNull();

        const bars = container.querySelectorAll('[data-slot="skeleton"]');
        expect(bars.length).toBeGreaterThan(0);
        bars.forEach((bar) => {
            expect(hiddenContainer?.contains(bar)).toBe(true);
        });
    });

    it('merges a custom className onto the root', () => {
        const { container } = render(<ListSkeleton className="mt-4" />);

        const root = container.querySelector('[role="status"]');
        expect(root).not.toBeNull();
        expect(root?.className).toContain('mt-4');
    });
});
