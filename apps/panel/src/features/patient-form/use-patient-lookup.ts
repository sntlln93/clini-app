import { api } from '@/lib/api';
import { mapToAppError } from '@/lib/api-errors';
import type { DocumentType, Patient } from '@/types/patient';
import { useQuery } from '@tanstack/react-query';

const MIN_DOCUMENT_NUMBER_LENGTH = 6;

/**
 * Prefill support for the create form: resolves an existing patient by document pair.
 * `patients.not_found` is the expected answer for an unregistered document, so it
 * resolves to `null` instead of surfacing as a query error.
 */
export function usePatientLookup(
    documentType: DocumentType | '',
    documentNumber: string,
) {
    return useQuery({
        queryKey: ['patients', 'lookup', documentType, documentNumber],
        queryFn: () =>
            api
                // POST, though it only reads: the document stays out of the URL and so out of access logs (#322).
                .post<{ data: Patient }>('/patients/lookup', {
                    document_type: documentType,
                    document_number: documentNumber,
                })
                .then((response) => response.data.data)
                .catch((error: unknown) => {
                    const appError = mapToAppError(error);

                    if (
                        appError.kind === 'business' &&
                        appError.code === 'patients.not_found'
                    ) {
                        return null;
                    }

                    throw error;
                }),
        enabled:
            documentType !== '' &&
            documentNumber.length >= MIN_DOCUMENT_NUMBER_LENGTH,
        retry: false,
    });
}
