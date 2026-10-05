import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardSkeleton } from './CardSkeleton';

describe('CardSkeleton', () => {
    it('renders a busy status region announcing Cargando…', () => {
        render(<CardSkeleton />);

        const status = screen.getByRole('status');
        expect(status.getAttribute('aria-busy')).toBe('true');
        expect(status.textContent).toContain('Cargando…');
    });

    it('keeps every skeleton bar inside the aria-hidden container', () => {
        const { container } = render(<CardSkeleton />);

        const hidden = container.querySelector('[aria-hidden="true"]');
        const bars = container.querySelectorAll('[data-slot="skeleton"]');
        expect(bars).toHaveLength(4);
        bars.forEach((bar) => expect(hidden?.contains(bar)).toBe(true));
    });
});
