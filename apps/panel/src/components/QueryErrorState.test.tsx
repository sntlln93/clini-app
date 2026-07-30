import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueryErrorState } from './QueryErrorState';

function domainError(status: number, code: string) {
    return {
        isAxiosError: true,
        response: {
            status,
            data: { error: { code, message: 'x', context: {} } },
        },
    };
}

describe('QueryErrorState', () => {
    it('renders the no-active-organization message for the organizations.no_active_membership domain error, regardless of which section renders it', () => {
        render(
            <QueryErrorState
                error={domainError(403, 'organizations.no_active_membership')}
            />,
        );

        expect(
            screen.getByText(
                'Tu cuenta no tiene una organización activa. Pedí acceso a un administrador.',
            ),
        ).not.toBeNull();
    });

    it('renders the generic message for a 500 axios error with no domain envelope', () => {
        render(
            <QueryErrorState
                error={{
                    isAxiosError: true,
                    response: { status: 500, data: {} },
                }}
            />,
        );

        expect(
            screen.getByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });

    it('renders the generic message for a plain non-axios Error', () => {
        render(<QueryErrorState error={new Error('boom')} />);

        expect(
            screen.getByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });
});
