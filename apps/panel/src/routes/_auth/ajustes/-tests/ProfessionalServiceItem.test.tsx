import { api } from '@/lib/api';
import type { CatalogService, ProfessionalService } from '@/types/professional';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfessionalServiceItem } from '../-components/ProfessionalServiceItem';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const SERVICE: CatalogService = { id: 1, name: 'Consulta general' };

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

describe('ProfessionalServiceItem', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
        vi.mocked(api.delete).mockReset();
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
                    price_cents: 7500,
                    active: false,
                },
            ),
        );
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
});
