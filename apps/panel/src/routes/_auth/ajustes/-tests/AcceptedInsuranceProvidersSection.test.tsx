import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import type { InsuranceProvider } from '@/types/patient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptedInsuranceProvidersSection } from '../-components/AcceptedInsuranceProvidersSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), put: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

const CATALOG: InsuranceProvider[] = [
    { id: 1, name: 'Galeno' },
    { id: 2, name: 'IOMA' },
    { id: 3, name: 'OSDE' },
];

function renderSection(accepted: InsuranceProvider[]) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['booking', 'consultorio', 'organization'], {});
    render(
        <QueryClientProvider client={queryClient}>
            <AcceptedInsuranceProvidersSection
                insuranceProviders={CATALOG}
                accepted={accepted}
            />
        </QueryClientProvider>,
    );

    return queryClient;
}

function checkbox(name: string) {
    return screen.getByRole('checkbox', { name });
}

describe('AcceptedInsuranceProvidersSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.put).mockResolvedValue({ data: { data: [] } });
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    });

    it('checks the accepted providers and saves nothing until the selection changes', () => {
        renderSection([CATALOG[2]]);

        expect(checkbox('OSDE').getAttribute('aria-checked')).toBe('true');
        expect(checkbox('Galeno').getAttribute('aria-checked')).toBe('false');
        expect(
            screen
                .getByRole('button', { name: 'Guardar obras sociales' })
                .hasAttribute('disabled'),
        ).toBe(true);
    });

    it('sends the whole selection on save and drops the cached booking pages', async () => {
        const queryClient = renderSection([CATALOG[2]]);

        fireEvent.click(checkbox('Galeno'));
        fireEvent.click(checkbox('OSDE'));
        fireEvent.click(checkbox('IOMA'));
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar obras sociales' }),
        );

        await waitFor(() =>
            expect(api.put).toHaveBeenCalledWith(
                '/organization/insurance-providers',
                { insurance_provider_ids: [1, 2] },
            ),
        );
        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith(
                'Obras sociales guardadas',
            ),
        );
        expect(
            queryClient.getQueryData([
                'booking',
                'consultorio',
                'organization',
            ]),
        ).toBeUndefined();
    });

    it('lets the practice clear every provider', async () => {
        renderSection([CATALOG[0]]);

        fireEvent.click(checkbox('Galeno'));
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar obras sociales' }),
        );

        await waitFor(() =>
            expect(api.put).toHaveBeenCalledWith(
                '/organization/insurance-providers',
                { insurance_provider_ids: [] },
            ),
        );
    });
});
