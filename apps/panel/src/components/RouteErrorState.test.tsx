import type { ErrorComponentProps } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RouteErrorState } from './RouteErrorState';

function axiosError(status: number) {
    return { isAxiosError: true, response: { status } };
}

function errorProps(error: unknown): ErrorComponentProps {
    return { error: error as Error, reset: vi.fn() };
}

describe('RouteErrorState', () => {
    it('renders the missing-active-organization message for a 403 axios error', () => {
        render(<RouteErrorState {...errorProps(axiosError(403))} />);

        expect(
            screen.getByText(
                'Tu cuenta no tiene una organización activa. Pedí acceso a un administrador para ver los pacientes.',
            ),
        ).not.toBeNull();
    });

    it('renders the generic message for a 500 axios error', () => {
        render(<RouteErrorState {...errorProps(axiosError(500))} />);

        expect(
            screen.getByText(
                'No pudimos cargar la información. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });

    it('renders the generic message for a plain non-axios Error', () => {
        render(<RouteErrorState {...errorProps(new Error('boom'))} />);

        expect(
            screen.getByText(
                'No pudimos cargar la información. Intentá nuevamente.',
            ),
        ).not.toBeNull();
    });
});
