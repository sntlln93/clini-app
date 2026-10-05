import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
    it('starts light, regardless of the OS theme', () => {
        render(<ThemeToggle />);

        expect(
            screen.getByRole<HTMLInputElement>('radio', { name: 'Claro' })
                .checked,
        ).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('switches to dark and remembers it', () => {
        render(<ThemeToggle />);

        fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));

        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('clini-landing-theme')).toBe('"dark"');
    });
});

describe('ThemeToggle after a click that landed before hydration', () => {
    it('still applies the theme when the radio is already checked', () => {
        render(<ThemeToggle />);
        const dark = screen.getByRole<HTMLInputElement>('radio', {
            name: 'Oscuro',
        });
        // What the browser does on its own for a click before React hydrates.
        dark.checked = true;

        fireEvent.click(dark);

        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
});
