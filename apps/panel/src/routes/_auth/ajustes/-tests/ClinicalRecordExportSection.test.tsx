import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicalRecordExportSection } from '../-components/ClinicalRecordExportSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

describe('ClinicalRecordExportSection', () => {
    let downloads: string[];

    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        downloads = [];
        URL.createObjectURL = vi.fn(() => 'blob:history');
        URL.revokeObjectURL = vi.fn();
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
            function (this: HTMLAnchorElement) {
                downloads.push(this.download);
            },
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('downloads every attended patient as one JSON file', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: new Blob(['{}']) });
        render(
            <QueryClientProvider client={new QueryClient()}>
                <ClinicalRecordExportSection />
            </QueryClientProvider>,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Exportar mis pacientes' }),
        );

        await waitFor(() =>
            expect(downloads).toEqual(['historia-clinica.json']),
        );
        expect(api.get).toHaveBeenCalledWith(
            '/clinical-record/attended-patients',
            { params: {}, responseType: 'blob' },
        );
    });
});
