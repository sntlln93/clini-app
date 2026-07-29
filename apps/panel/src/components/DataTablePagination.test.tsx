import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTablePagination } from './DataTablePagination';

// The page window renders numbers via `PaginationLink` and gaps via
// `PaginationEllipsis` (an `aria-hidden` icon + a `sr-only` "Más páginas"
// span, no literal "…" text) — so counting/ordering the window means
// walking the DOM by `data-slot`, not `getByText('…')`. `PaginationPrevious`
// and `PaginationNext` share the `pagination-link` slot with the numbers,
// so they're excluded here by their `aria-label` (numbers have none).
function pageWindowSequence(container: HTMLElement): string[] {
    const nodes = Array.from(
        container.querySelectorAll(
            '[data-slot="pagination-link"], [data-slot="pagination-ellipsis"]',
        ),
    );

    return nodes
        .filter((node) => !node.hasAttribute('aria-label'))
        .map((node) =>
            node.getAttribute('data-slot') === 'pagination-ellipsis'
                ? '…'
                : (node.textContent ?? '').trim(),
        );
}

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

    it('shows every page with no ellipsis when they all fit (lastPage=5, currentPage=3)', () => {
        const { container } = render(
            <DataTablePagination
                currentPage={3}
                lastPage={5}
                total={50}
                label="pacientes"
                onPageChange={vi.fn()}
            />,
        );

        expect(pageWindowSequence(container)).toEqual([
            '1',
            '2',
            '3',
            '4',
            '5',
        ]);
    });

    it('collapses the tail into a single ellipsis near the first page (lastPage=20, currentPage=1)', () => {
        const { container } = render(
            <DataTablePagination
                currentPage={1}
                lastPage={20}
                total={200}
                label="pacientes"
                onPageChange={vi.fn()}
            />,
        );

        const sequence = pageWindowSequence(container);
        expect(sequence).toEqual(['1', '2', '…', '20']);
        expect(sequence.filter((item) => item === '…')).toHaveLength(1);
    });

    it('shows both ellipses around the current page window (lastPage=20, currentPage=10)', () => {
        const { container } = render(
            <DataTablePagination
                currentPage={10}
                lastPage={20}
                total={200}
                label="pacientes"
                onPageChange={vi.fn()}
            />,
        );

        const sequence = pageWindowSequence(container);
        expect(sequence).toEqual(['1', '…', '9', '10', '11', '…', '20']);
        expect(sequence.filter((item) => item === '…')).toHaveLength(2);
        // Widest case: exactly 7 number/ellipsis items.
        expect(sequence).toHaveLength(7);
    });

    it('collapses the head into a single ellipsis near the last page (lastPage=20, currentPage=20)', () => {
        const { container } = render(
            <DataTablePagination
                currentPage={20}
                lastPage={20}
                total={200}
                label="pacientes"
                onPageChange={vi.fn()}
            />,
        );

        const sequence = pageWindowSequence(container);
        expect(sequence).toEqual(['1', '…', '19', '20']);
        expect(sequence.filter((item) => item === '…')).toHaveLength(1);
    });

    it('marks only the current page link with aria-current="page"', () => {
        render(
            <DataTablePagination
                currentPage={10}
                lastPage={20}
                total={200}
                label="pacientes"
                onPageChange={vi.fn()}
            />,
        );

        expect(
            screen
                .getByRole('button', { name: '10' })
                .getAttribute('aria-current'),
        ).toBe('page');
        expect(
            screen
                .getByRole('button', { name: '9' })
                .getAttribute('aria-current'),
        ).toBeNull();
        expect(
            screen
                .getByRole('button', { name: '11' })
                .getAttribute('aria-current'),
        ).toBeNull();
    });

    it('clicking a page number calls onPageChange with that exact page, not currentPage ± 1', () => {
        const onPageChange = vi.fn();
        render(
            <DataTablePagination
                currentPage={10}
                lastPage={20}
                total={200}
                label="pacientes"
                onPageChange={onPageChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: '11' }));

        expect(onPageChange).toHaveBeenCalledWith(11);
        expect(onPageChange).not.toHaveBeenCalledWith(9);
    });

    it('keeps the Previous/Next controls present and enabled alongside the page window', () => {
        render(
            <DataTablePagination
                currentPage={10}
                lastPage={20}
                total={200}
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
        ).toBe(false);
        expect(
            (
                screen.getByRole('button', {
                    name: 'Ir a la página siguiente',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(false);
    });
});
