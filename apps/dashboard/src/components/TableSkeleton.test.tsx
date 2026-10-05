import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TableSkeleton } from './TableSkeleton';

describe('TableSkeleton', () => {
    it('renders a status role region announcing Cargando…', () => {
        render(<TableSkeleton />);

        const status = screen.getByRole('status');

        expect(status).not.toBeNull();
        expect(status.textContent).toContain('Cargando…');
    });

    it('with default props renders 24 skeleton bars (one header row of 4 plus 5 body rows of 4)', () => {
        const { container } = render(<TableSkeleton />);

        expect(
            container.querySelectorAll('[data-slot="skeleton"]'),
        ).toHaveLength(24);
    });

    it('with rows=2 columns=3 renders 9 skeleton bars', () => {
        const { container } = render(<TableSkeleton rows={2} columns={3} />);

        expect(
            container.querySelectorAll('[data-slot="skeleton"]'),
        ).toHaveLength(9);
    });

    it('keeps the decorative bars out of the accessibility tree', () => {
        const { container } = render(<TableSkeleton />);

        const hiddenContainer = container.querySelector('[aria-hidden="true"]');
        expect(hiddenContainer).not.toBeNull();

        const bars = container.querySelectorAll('[data-slot="skeleton"]');
        expect(bars.length).toBeGreaterThan(0);
        bars.forEach((bar) => {
            expect(hiddenContainer?.contains(bar)).toBe(true);
        });
    });

    it('merges a custom className onto the root without dropping rounded-md/border', () => {
        const { container } = render(<TableSkeleton className="mt-4" />);

        const root = container.querySelector('[role="status"]');
        expect(root).not.toBeNull();
        expect(root?.className).toContain('rounded-md');
        expect(root?.className).toContain('border');
        expect(root?.className).toContain('mt-4');
    });
});
