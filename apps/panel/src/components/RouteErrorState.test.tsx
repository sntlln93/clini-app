import type { ErrorComponentProps } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RouteErrorState } from './RouteErrorState';

function domainError(status: number, code: string) {
    return {
        isAxiosError: true,
        response: {
            status,
            data: { error: { code, message: 'x', context: {} } },
        },
    };
}

function errorProps(error: unknown): ErrorComponentProps {
    return { error: error as Error, reset: vi.fn() };
}

describe('RouteErrorState', () => {
    it('renders the no-active-organization message for the organizations.no_active_membership domain error', () => {
        render(
            <RouteErrorState
                {...errorProps(
                    domainError(403, 'organizations.no_active_membership'),
                )}
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
            <RouteErrorState
                {...errorProps({
                    isAxiosError: true,
                    response: { status: 500, data: {} },
                })}
            />,
        );

        expect(
            screen.getByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });

    it('renders the generic message for a plain non-axios Error', () => {
        render(<RouteErrorState {...errorProps(new Error('boom'))} />);

        expect(
            screen.getByText(
                'Ocurrió un error inesperado. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });
});
