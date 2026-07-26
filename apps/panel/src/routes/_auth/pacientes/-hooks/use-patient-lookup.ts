import { api } from '@/lib/api';
import type { DocumentType, Patient } from '@/types/patient';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const MIN_DOCUMENT_NUMBER_LENGTH = 6;

/**
 * Prefill support for the create form: resolves an existing patient by
 * document pair. A 404 means "no existe" — the normal, expected answer for
 * a document that hasn't been registered yet — so it resolves to `null`
 * instead of surfacing as a query error.
 */
export function usePatientLookup(
    documentType: DocumentType | '',
    documentNumber: string,
) {
    return useQuery({
        queryKey: ['patients', 'lookup', documentType, documentNumber],
        queryFn: () =>
            api
                .get<{ data: Patient }>('/patients/lookup', {
                    params: {
                        document_type: documentType,
                        document_number: documentNumber,
                    },
                })
                .then((response) => response.data.data)
                .catch((error: unknown) => {
                    if (
                        axios.isAxiosError(error) &&
                        error.response?.status === 404
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
