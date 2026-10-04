import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardErrorState } from './CardErrorState';

describe('CardErrorState', () => {
    it('renders the title as a heading, the message as an alert and the action', () => {
        render(
            <CardErrorState
                title="Enlace no válido"
                message="El enlace venció."
                action={<button type="button">Ir a Clini</button>}
            />,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Enlace no válido' }),
        ).not.toBeNull();
        expect(screen.getByRole('alert').textContent).toBe('El enlace venció.');
        expect(
            screen.getByRole('button', { name: 'Ir a Clini' }),
        ).not.toBeNull();
    });
});
