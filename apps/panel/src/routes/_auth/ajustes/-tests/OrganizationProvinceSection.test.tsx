import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationProvinceSection } from '../-components/OrganizationProvinceSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), put: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

function renderSection(province: string | null) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <OrganizationProvinceSection province={province} />
        </QueryClientProvider>,
    );
}

// base-ui's roving-tabindex needs a real pointer sequence in jsdom; a bare `click` doesn't register.
async function pickOption(combobox: string, name: string) {
    fireEvent.click(screen.getByRole('combobox', { name: combobox }));
    const option = await screen.findByRole('option', { name });
    fireEvent.pointerDown(option);
    fireEvent.pointerUp(option);
    fireEvent.click(option);
}

describe('OrganizationProvinceSection', () => {
    beforeEach(() => {
        vi.mocked(api.put).mockReset().mockResolvedValue({ data: {} });
    });

    it('shows the saved province by its name', () => {
        renderSection('la-rioja');

        expect(
            screen.getByRole('combobox', { name: 'Provincia del consultorio' })
                .textContent,
        ).toContain('La Rioja');
        expect(
            screen
                .getByRole('button', { name: 'Guardar' })
                .hasAttribute('disabled'),
        ).toBe(true);
    });

    it('declares the province picked', async () => {
        renderSection(null);

        await pickOption('Provincia del consultorio', 'Córdoba');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.put).toHaveBeenCalledWith('/organization/province', {
                province: 'cordoba',
            }),
        );
    });

    it('drops the cached booking slots, whose holidays depend on the province', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(['booking', 'consultorio', 'slots'], []);
        render(
            <QueryClientProvider client={queryClient}>
                <OrganizationProvinceSection province={null} />
            </QueryClientProvider>,
        );

        await pickOption('Provincia del consultorio', 'Córdoba');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(
                queryClient.getQueryData(['booking', 'consultorio', 'slots']),
            ).toBeUndefined(),
        );
    });
});
