import { api } from '@/lib/api';
import type { CatalogService, ProfessionalService } from '@/types/professional';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfessionalServiceItem } from '../-components/ProfessionalServiceItem';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

const SERVICE: CatalogService = { id: 1, name: 'Consulta general' };
const OTHER_SERVICE: CatalogService = { id: 2, name: 'Consulta clínica' };

const ASSIGNMENT: ProfessionalService = {
    id: 10,
    membership_id: 3,
    service_id: 1,
    service_name: 'Consulta general',
    duration_minutes: 30,
    price_cents: 5000,
    active: true,
};

function renderItem(assignment: ProfessionalService | null) {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <ProfessionalServiceItem
                membershipId={3}
                service={SERVICE}
                assignment={assignment}
                canManage
            />
        </QueryClientProvider>,
    );
}

function renderTwoItems() {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <ProfessionalServiceItem
                membershipId={3}
                service={SERVICE}
                assignment={null}
                canManage
            />
            <ProfessionalServiceItem
                membershipId={3}
                service={OTHER_SERVICE}
                assignment={null}
                canManage
            />
        </QueryClientProvider>,
    );
}

describe('ProfessionalServiceItem', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.patch).mockReset();
        vi.mocked(api.delete).mockReset();
        invalidate.mockReset();
    });

    it('renders currency as read-only ARS text with no editable control', () => {
        renderItem(ASSIGNMENT);

        screen.getByText('ARS');
        const monedaLabel = screen.getByText('Moneda');
        const container = monedaLabel.closest('div');
        expect(
            container?.querySelector(
                'input, select, button, [role="combobox"]',
            ),
        ).toBeNull();
    });

    it('sends the edited duration, price and active flag to the update mutation', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderItem(ASSIGNMENT);

        fireEvent.change(screen.getByLabelText(/Duración/), {
            target: { value: '45' },
        });
        fireEvent.change(screen.getByLabelText(/Precio/), {
            target: { value: '7500' },
        });
        fireEvent.click(screen.getByRole('switch', { name: /Activo/ }));

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith(
                '/memberships/3/services/1',
                {
                    service_id: 1,
                    duration_minutes: 45,
                    price_cents: 750000,
                    active: false,
                },
            ),
        );
    });

    it('prefills the price in pesos and shows it formatted', () => {
        renderItem({ ...ASSIGNMENT, price_cents: 1500000 });

        expect(
            (screen.getByLabelText('Precio ($)') as HTMLInputElement).value,
        ).toBe('15000');
        screen.getByText('$ 15.000,00');
    });

    it('reads an es-AR amount with thousands dots and comma decimals', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderItem(ASSIGNMENT);

        fireEvent.change(screen.getByLabelText('Precio ($)'), {
            target: { value: '15.000,50' },
        });
        screen.getByText('$ 15.000,50');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith(
                '/memberships/3/services/1',
                expect.objectContaining({ price_cents: 1500050 }),
            ),
        );
    });

    it('flags an invalid price instead of treating it as no price', () => {
        renderItem(ASSIGNMENT);

        fireEvent.change(screen.getByLabelText('Precio ($)'), {
            target: { value: '15,000.50' },
        });

        screen.getByText(
            'Ingresá un monto válido, por ejemplo 15.000 o 15.000,50',
        );
        expect(screen.queryByText('Sin precio')).toBeNull();
        expect(screen.getByRole('button', { name: 'Guardar' })).toHaveProperty(
            'disabled',
            true,
        );
    });

    it('sends an emptied price as null', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderItem(ASSIGNMENT);

        fireEvent.change(screen.getByLabelText('Precio ($)'), {
            target: { value: '' },
        });
        screen.getByText('Sin precio');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith(
                '/memberships/3/services/1',
                expect.objectContaining({ price_cents: null }),
            ),
        );
    });

    it.each([
        ['an empty duration', /Duración/, ''],
        ['a zero duration', /Duración/, '0'],
        ['a fractional duration', /Duración/, '1.5'],
        ['a negative price', /Precio/, '-10'],
        ['an ambiguous price', /Precio/, '15,000.50'],
    ])('disables Guardar for %s', (_label, field, value) => {
        renderItem(ASSIGNMENT);
        const save = screen.getByRole('button', { name: 'Guardar' });
        expect(save).toHaveProperty('disabled', false);

        fireEvent.change(screen.getByLabelText(field), { target: { value } });

        expect(save).toHaveProperty('disabled', true);
    });

    it('explains an invalid duration under the field', () => {
        renderItem(ASSIGNMENT);

        fireEvent.change(screen.getByLabelText(/Duración/), {
            target: { value: '' },
        });

        screen.getByText('La duración debe ser de al menos 1 minuto');
    });

    it('requires confirmation before removing an assigned service', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        renderItem(ASSIGNMENT);

        fireEvent.click(
            screen.getByRole('checkbox', { name: 'Consulta general' }),
        );

        expect(api.delete).not.toHaveBeenCalled();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Confirmar' }),
        );

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith(
                '/memberships/3/services/1',
            ),
        );
    });

    it('clicking the service label toggles the assignment checkbox', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderItem(null);

        fireEvent.click(screen.getByText('Consulta general'));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/memberships/3/services', {
                service_id: 1,
                duration_minutes: 30,
                price_cents: null,
                active: true,
            }),
        );
    });

    it('exposes the duration and price fields with their labels', () => {
        renderItem(ASSIGNMENT);

        expect(
            screen.getByRole('spinbutton', { name: /Duración/ }),
        ).not.toBeNull();
        expect(screen.getByRole('textbox', { name: /Precio/ })).not.toBeNull();
    });

    it('keeps distinct field ids across two rows, so each label maps to its own checkbox', () => {
        renderTwoItems();

        const consultaGeneral = screen.getByRole('checkbox', {
            name: 'Consulta general',
        });
        const consultaClinica = screen.getByRole('checkbox', {
            name: 'Consulta clínica',
        });

        expect(consultaGeneral).not.toBe(consultaClinica);
    });
});
