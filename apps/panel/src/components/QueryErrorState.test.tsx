import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueryErrorState } from './QueryErrorState';

function axiosError(status: number) {
    return { isAxiosError: true, response: { status } };
}

describe('QueryErrorState', () => {
    it('renders the missing-active-organization message for a 403 axios error', () => {
        render(<QueryErrorState error={axiosError(403)} />);

        expect(
            screen.getByText(
                'Tu cuenta no tiene una organización activa. Pedí acceso a un administrador para ver los pacientes.',
            ),
        ).not.toBeNull();
    });

    it('renders the generic message for a 500 axios error', () => {
        render(<QueryErrorState error={axiosError(500)} />);

        expect(
            screen.getByText(
                'No pudimos cargar la información. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });

    it('renders the generic message for a plain non-axios Error', () => {
        render(<QueryErrorState error={new Error('boom')} />);

        expect(
            screen.getByText(
                'No pudimos cargar la información. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });
});
