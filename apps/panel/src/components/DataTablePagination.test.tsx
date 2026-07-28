import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTablePagination } from './DataTablePagination';

describe('DataTablePagination', () => {
    it('renders nothing when there is only one page', () => {
        const { container } = render(
            <DataTablePagination
                currentPage={1}
                lastPage={1}
                total={5}
                label="pacientes"
                onPageChange={vi.fn()}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders the page summary text', () => {
        render(
            <DataTablePagination
                currentPage={1}
                lastPage={3}
                total={25}
                label="pacientes"
                onPageChange={vi.fn()}
            />,
        );

        expect(
            screen.getByText((_, element) => {
                if (element?.tagName.toLowerCase() !== 'p') {
                    return false;
                }
                return (
                    element.textContent?.replace(/\s+/g, ' ').trim() ===
                    'Página 1 de 3 (25 pacientes)'
                );
            }),
        ).not.toBeNull();
    });

    it('disables the previous control and enables next on the first page', () => {
        render(
            <DataTablePagination
                currentPage={1}
                lastPage={3}
                total={25}
                label="pacientes"
                onPageChange={vi.fn()}
            />,
        );

        expect(
            (
                screen.getByRole('button', {
                    name: 'Ir a la página anterior',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(
            (
                screen.getByRole('button', {
                    name: 'Ir a la página siguiente',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(false);
    });

    it('disables the next control and enables previous on the last page', () => {
        render(
            <DataTablePagination
                currentPage={3}
                lastPage={3}
                total={25}
                label="pacientes"
                onPageChange={vi.fn()}
            />,
        );

        expect(
            (
                screen.getByRole('button', {
                    name: 'Ir a la página siguiente',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(
            (
                screen.getByRole('button', {
                    name: 'Ir a la página anterior',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(false);
    });

    it('calls onPageChange with the next and previous page numbers', () => {
        const onPageChange = vi.fn();
        render(
            <DataTablePagination
                currentPage={2}
                lastPage={3}
                total={25}
                label="pacientes"
                onPageChange={onPageChange}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Ir a la página siguiente' }),
        );
        expect(onPageChange).toHaveBeenCalledWith(3);

        fireEvent.click(
            screen.getByRole('button', { name: 'Ir a la página anterior' }),
        );
        expect(onPageChange).toHaveBeenCalledWith(1);
    });
});
