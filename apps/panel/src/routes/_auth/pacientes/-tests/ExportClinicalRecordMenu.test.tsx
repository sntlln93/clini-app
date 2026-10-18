import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportClinicalRecordMenu } from '../-components/ExportClinicalRecordMenu';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

function renderMenu() {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <ExportClinicalRecordMenu patientId={42} />
        </QueryClientProvider>,
    );
}

async function choose(name: string) {
    fireEvent.click(
        screen.getByRole('button', { name: 'Exportar historia clínica' }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name }));
}

describe('ExportClinicalRecordMenu', () => {
    const click = vi.fn();
    let downloads: string[];

    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(toast.success).mockReset();
        vi.mocked(toast.error).mockReset();
        downloads = [];
        URL.createObjectURL = vi.fn(() => 'blob:history');
        URL.revokeObjectURL = vi.fn();
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
            function (this: HTMLAnchorElement) {
                downloads.push(this.download);
                click();
            },
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('downloads the PDF as a blob named only by the patient id', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: new Blob(['%PDF']) });
        renderMenu();

        await choose('PDF, para leer o imprimir');

        await waitFor(() =>
            expect(downloads).toEqual(['historia-clinica-42.pdf']),
        );
        expect(api.get).toHaveBeenCalledWith('/patients/42/clinical-record', {
            params: { format: 'pdf' },
            responseType: 'blob',
        });
        expect(toast.success).toHaveBeenCalledWith(
            'Historia clínica descargada',
        );
    });

    it('downloads the structured JSON', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: new Blob(['{}']) });
        renderMenu();

        await choose('JSON, con los datos estructurados');

        await waitFor(() =>
            expect(downloads).toEqual(['historia-clinica-42.json']),
        );
        expect(api.get).toHaveBeenCalledWith('/patients/42/clinical-record', {
            params: { format: 'json' },
            responseType: 'blob',
        });
    });

    it('says so when the export fails, and downloads nothing', async () => {
        vi.mocked(api.get).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 500, data: new Blob() },
        });
        renderMenu();

        await choose('PDF, para leer o imprimir');

        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith(
                'No se pudo exportar la historia clínica.',
            ),
        );
        expect(click).not.toHaveBeenCalled();
    });
});
