import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListViewToggle } from './ListViewToggle';

describe('ListViewToggle', () => {
    it('marks the current view as pressed', () => {
        render(<ListViewToggle value="cards" onChange={vi.fn()} />);

        expect(
            screen
                .getByRole('button', { name: 'Ver como tarjetas' })
                .getAttribute('aria-pressed'),
        ).toBe('true');
        expect(
            screen
                .getByRole('button', { name: 'Ver como tabla' })
                .getAttribute('aria-pressed'),
        ).toBe('false');
    });

    it('asks for the chosen view', () => {
        const onChange = vi.fn();
        render(<ListViewToggle value="cards" onChange={onChange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }));

        expect(onChange).toHaveBeenCalledWith('tabla');
    });
});
