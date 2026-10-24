import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { readBlobErrorBody } from '@/lib/api-errors';
import { saveFile } from '@/lib/download';
import { notifyError, notifySuccess } from '@/lib/toast';
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
        // Only the id names the file, as the API does: it stays in the download history.
        filename: `historia-clinica-${request.patientId}.${request.format}`,
    };
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
            const response = await api
                .get<Blob>(url, { params, responseType: 'blob' })
                .catch(async (error: unknown) => {
                    throw await readBlobErrorBody(error);
                });

            saveFile(response.data, filename);
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
