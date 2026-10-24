import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { readBlobErrorBody } from '@/lib/api-errors';
import { renderClinicalRecordPdf } from '@/lib/clinical-record-pdf/render';
import { saveFile } from '@/lib/download';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { ClinicalRecordDocument } from '@/types/clinical-record';
import { useMutation } from '@tanstack/react-query';

export type ClinicalRecordExportFormat = 'pdf' | 'json';

export type ClinicalRecordExport =
    | {
          scope: 'patient';
          patientId: number;
          format: ClinicalRecordExportFormat;
      }
    | { scope: 'attended_patients' };

function exportRequest(request: ClinicalRecordExport) {
    if (request.scope === 'attended_patients') {
        return {
            url: '/clinical-record/attended-patients',
            params: {},
            filename: 'historia-clinica.json',
        };
    }

    return {
        url: `/patients/${request.patientId}/clinical-record`,
        params: { format: request.format },
        // Only the id names the file: it stays in the download history.
        filename: `historia-clinica-${request.patientId}.${request.format}`,
    };
}

// The API answers data, never a file (ADR 0023): the JSON is saved as it
// comes, and the PDF is drawn here from the same data.
async function buildFile(
    request: ClinicalRecordExport,
    url: string,
    params: object,
    refreshTrail: () => Promise<unknown>,
): Promise<Blob> {
    if (request.scope === 'patient' && request.format === 'pdf') {
        const response = await api.get<ClinicalRecordDocument>(url, { params });

        // Once the API answered, the export is recorded: a PDF that then
        // fails to draw still adds its row to the trail on the page.
        try {
            return await renderClinicalRecordPdf(response.data);
        } catch (error) {
            await refreshTrail();
            throw error;
        }
    }

    const response = await api
        .get<Blob>(url, { params, responseType: 'blob' })
        .catch(async (error: unknown) => {
            throw await readBlobErrorBody(error);
        });

    return response.data;
}

/**
 * Downloads the clinical history (#326): one patient's, as PDF or JSON, or
 * every patient the professional attended, as JSON. The API decides who may
 * and records each export, so nothing here gates it; it is a mutation only
 * because the user triggers it, nothing is cached. A patient's export adds a
 * row to the access trail on their page, which reloads; the loader always
 * reads the trail fresh (#325), so there is no key to drop.
 */
export function useClinicalRecordExport() {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: async (request: ClinicalRecordExport) => {
            const { url, params, filename } = exportRequest(request);

            saveFile(
                await buildFile(request, url, params, refreshPageData),
                filename,
            );
        },
        onSuccess: async (_data, request) => {
            notifySuccess('Historia clínica descargada');

            if (request.scope === 'patient') {
                await refreshPageData();
            }
        },
        onError: (error) =>
            notifyError(error, 'No se pudo exportar la historia clínica.'),
    });
}
