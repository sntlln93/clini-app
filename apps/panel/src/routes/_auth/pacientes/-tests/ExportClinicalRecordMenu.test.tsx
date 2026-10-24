import { api } from '@/lib/api';
import { ERROR_CODE_MESSAGES } from '@/lib/error-codes';
import { buildClinicalRecord } from '@/tests/fixtures/clinical-record';
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

const refresh = vi.fn(() => Promise.resolve());
const renderPdf = vi.hoisted(() => vi.fn());
vi.mock('@/lib/clinical-record-pdf/render', () => ({
    renderClinicalRecordPdf: renderPdf,
}));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
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
        refresh.mockClear();
        renderPdf.mockReset();
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

    // ADR 0023: the API answers the data, and the PDF is drawn here.
    it('draws the PDF from the data and downloads it named only by the patient id', async () => {
        const record = buildClinicalRecord();
        vi.mocked(api.get).mockResolvedValueOnce({ data: record });
        renderPdf.mockResolvedValueOnce(new Blob(['%PDF']));
        renderMenu();

        await choose('PDF, para leer o imprimir');

        await waitFor(() =>
            expect(downloads).toEqual(['historia-clinica-42.pdf']),
        );
        expect(api.get).toHaveBeenCalledWith('/patients/42/clinical-record', {
            params: { format: 'pdf' },
        });
        expect(renderPdf).toHaveBeenCalledWith(record);
        expect(toast.success).toHaveBeenCalledWith(
            'Historia clínica descargada',
        );
        // The export is a new row of the trail on this page (#325).
        await waitFor(() => expect(refresh).toHaveBeenCalledWith());
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
        expect(renderPdf).not.toHaveBeenCalled();
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
        expect(refresh).not.toHaveBeenCalled();
    });

    // The API recorded the export before the PDF failed to draw (#325).
    it('reloads the access trail when the PDF fails to draw', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: buildClinicalRecord(),
        });
        renderPdf.mockRejectedValueOnce(new Error('Invalid svg document'));
        renderMenu();

        await choose('PDF, para leer o imprimir');

        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith(
                'No se pudo exportar la historia clínica.',
            ),
        );
        expect(refresh).toHaveBeenCalledWith();
        expect(click).not.toHaveBeenCalled();
    });

    it('shows the catalog message of a coded error, though its body comes as a Blob', async () => {
        vi.mocked(api.get).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 403,
                data: new Blob(
                    [
                        JSON.stringify({
                            error: {
                                code: 'organizations.suspended',
                                message: 'Suspended',
                                context: {},
                            },
                        }),
                    ],
                    { type: 'application/json' },
                ),
            },
        });
        renderMenu();

        await choose('JSON, con los datos estructurados');

        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith(
                ERROR_CODE_MESSAGES['organizations.suspended'],
            ),
        );
    });
});
