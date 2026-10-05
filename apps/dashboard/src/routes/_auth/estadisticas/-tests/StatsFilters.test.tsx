import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { api } from '@/lib/api';
import { renderRoute } from '@/tests/render-route';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatsFilters } from '../-components/StatsFilters';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

/** Real time past the commit debounce, so "not called" means "held back", not "not yet". */
function pastDebounce() {
    return new Promise((resolve) =>
        setTimeout(resolve, SEARCH_DEBOUNCE_MS + 50),
    );
}

function renderFilters(
    organization: { id: number; name: string } | null = null,
) {
    const onChange = vi.fn();
    const result = renderRoute(
        <StatsFilters
            from="2026-09-05"
            to="2026-10-04"
            organization={organization}
            onChange={onChange}
        />,
        { path: '/estadisticas' },
    );

    return { onChange, result };
}

describe('StatsFilters', () => {
    it('shows the resolved period and pushes a valid range', async () => {
        const { onChange, result } = renderFilters();
        await result;

        expect((screen.getByLabelText('Desde') as HTMLInputElement).value).toBe(
            '2026-09-05',
        );
        fireEvent.change(screen.getByLabelText('Desde'), {
            target: { value: '2026-09-20' },
        });

        await waitFor(() =>
            expect(onChange).toHaveBeenCalledWith({
                from: '2026-09-20',
                to: '2026-10-04',
            }),
        );
    });

    it('debounces date edits: typing through intermediate dates commits once, with the last one', async () => {
        const { onChange, result } = renderFilters();
        await result;

        const desde = screen.getByLabelText('Desde') as HTMLInputElement;
        fireEvent.change(desde, { target: { value: '2026-09-02' } });
        fireEvent.change(desde, { target: { value: '2026-09-20' } });

        expect(onChange).not.toHaveBeenCalled();
        expect(desde.value).toBe('2026-09-20');
        await pastDebounce();

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith({
            from: '2026-09-20',
            to: '2026-10-04',
        });
    });

    it('validates an emptied "Hasta" as today, the API default', async () => {
        const { onChange, result } = renderFilters();
        await result;

        fireEvent.change(screen.getByLabelText('Hasta'), {
            target: { value: '' },
        });
        fireEvent.change(screen.getByLabelText('Desde'), {
            target: { value: '2999-01-01' },
        });

        screen.getByText(
            'Sin “Hasta”, el rango termina hoy: “Desde” no puede ser posterior a hoy.',
        );

        fireEvent.change(screen.getByLabelText('Desde'), {
            target: { value: '2020-01-01' },
        });

        screen.getByText(
            'Sin “Hasta”, el rango termina hoy y no puede superar los 366 días.',
        );
        await pastDebounce();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('pushes an emptied "Hasta" when the resulting range is valid', async () => {
        const { onChange, result } = renderFilters();
        await result;

        fireEvent.change(screen.getByLabelText('Hasta'), {
            target: { value: '' },
        });

        await waitFor(() =>
            expect(onChange).toHaveBeenCalledWith({
                from: '2026-09-05',
                to: undefined,
            }),
        );
    });

    it('holds back a range whose "Hasta" is before "Desde" and explains why', async () => {
        const { onChange, result } = renderFilters();
        await result;

        fireEvent.change(screen.getByLabelText('Hasta'), {
            target: { value: '2026-09-01' },
        });

        screen.getByText(
            'La fecha “Hasta” tiene que ser igual o posterior a “Desde”.',
        );
        await pastDebounce();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('rejects a range longer than 366 days client-side', async () => {
        const { onChange, result } = renderFilters();
        await result;

        fireEvent.change(screen.getByLabelText('Desde'), {
            target: { value: '2025-01-01' },
        });

        screen.getByText('El rango no puede superar los 366 días.');
        await pastDebounce();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('labels the active organization filter from period.organization and clears it', async () => {
        const { onChange, result } = renderFilters({
            id: 3,
            name: 'Clínica Sur',
        });
        await result;

        screen.getByText('Clínica Sur');
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Quitar filtro de organización',
            }),
        );

        expect(onChange).toHaveBeenCalledWith({ organization_id: undefined });
    });
});

describe('OrganizationPicker (via StatsFilters)', () => {
    it('debounces the search and sets organization_id on selection', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: {
                data: [{ id: 3, name: 'Clínica Sur', slug: 'clinica-sur' }],
                meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
                links: { first: null, last: null, prev: null, next: null },
            },
        });
        const { onChange, result } = renderFilters();
        await result;

        const input = screen.getByLabelText('Organización');
        fireEvent.change(input, { target: { value: 'cl' } });
        fireEvent.change(input, { target: { value: 'clín' } });
        expect(api.get).not.toHaveBeenCalled();

        fireEvent.mouseDown(
            await screen.findByRole('option', { name: /Clínica Sur/ }),
        );

        expect(api.get).toHaveBeenCalledTimes(1);
        expect(api.get).toHaveBeenCalledWith('/admin/organizations', {
            params: { q: 'clín', per_page: 20 },
        });
        await waitFor(() =>
            expect(onChange).toHaveBeenCalledWith({ organization_id: 3 }),
        );
    });

    it('is a combobox whose popup closes on Escape and blur, and picks with the keyboard', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: {
                data: [
                    { id: 3, name: 'Clínica Sur', slug: 'clinica-sur' },
                    { id: 4, name: 'Clínica Norte', slug: 'clinica-norte' },
                ],
                meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
                links: { first: null, last: null, prev: null, next: null },
            },
        });
        const { onChange, result } = renderFilters();
        await result;

        const input = screen.getByRole('combobox', { name: 'Organización' });
        expect(input.getAttribute('aria-expanded')).toBe('false');
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'clín' } });

        await screen.findByRole('option', { name: /Clínica Norte/ });
        expect(input.getAttribute('aria-expanded')).toBe('true');
        expect(input.getAttribute('aria-controls')).toBe(
            screen.getByRole('listbox').id,
        );
        screen.getByText('2 organizaciones encontradas');

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByRole('listbox')).toBeNull();

        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(input.getAttribute('aria-activedescendant')).toBe(
            screen.getByRole('option', { name: /Clínica Norte/ }).id,
        );

        fireEvent.blur(input);
        expect(input.getAttribute('aria-expanded')).toBe('false');

        fireEvent.focus(input);
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onChange).toHaveBeenCalledWith({ organization_id: 4 });
    });
});
