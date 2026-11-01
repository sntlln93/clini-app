import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { ProfessionalLicense } from '@/types/professional-license';
import { queryOptions, useMutation } from '@tanstack/react-query';

const LICENSES_KEY = ['professional-licenses'];
const DOCUMENT_KEY = ['professional-document'];

/** The caller's own licenses (#380): the API takes no user id. */
export const professionalLicensesQueryOptions = queryOptions({
    queryKey: LICENSES_KEY,
    queryFn: () =>
        api
            .get<{ data: ProfessionalLicense[] }>('/me/licenses')
            .then((response) => response.data.data),
});

/** The caller's own DNI, the one their licenses are looked up with. */
export const professionalDocumentQueryOptions = queryOptions({
    queryKey: DOCUMENT_KEY,
    queryFn: () =>
        api
            .get<{
                data: { document_number: string | null };
            }>('/me/professional-document')
            .then((response) => response.data.data.document_number),
});

export type NewProfessionalLicense = {
    number: string;
    province: string;
    profession: string;
};

// Every write reaches the registry and may change any license's status, so
// each one reloads both reads of the page.
function useRefreshLicenses() {
    const refreshPageData = useRefreshPageData();

    return () => refreshPageData(LICENSES_KEY, DOCUMENT_KEY);
}

export function useUpdateProfessionalDocument() {
    const refresh = useRefreshLicenses();

    return useMutation({
        mutationFn: (documentNumber: string | null) =>
            api.put('/me/professional-document', {
                document_number: documentNumber,
            }),
        onSuccess: () => refresh().then(() => notifySuccess('DNI guardado')),
        onError: (error) => notifyError(error, 'No se pudo guardar el DNI'),
    });
}

export function useAddProfessionalLicense() {
    const refresh = useRefreshLicenses();

    return useMutation({
        mutationFn: (license: NewProfessionalLicense) =>
            api.post('/me/licenses', license),
        onSuccess: () =>
            refresh().then(() => notifySuccess('Matrícula agregada')),
        onError: (error) =>
            notifyError(error, 'No se pudo agregar la matrícula'),
    });
}

export function useRemoveProfessionalLicense() {
    const refresh = useRefreshLicenses();

    return useMutation({
        mutationFn: (licenseId: number) =>
            api.delete(`/me/licenses/${licenseId}`),
        onSuccess: () =>
            refresh().then(() => notifySuccess('Matrícula quitada')),
        onError: (error) =>
            notifyError(error, 'No se pudo quitar la matrícula'),
    });
}

export function useVerifyProfessionalLicenses() {
    const refresh = useRefreshLicenses();

    return useMutation({
        mutationFn: () => api.post('/me/licenses/verification'),
        onSuccess: () =>
            refresh().then(() => notifySuccess('Matrículas consultadas')),
        onError: (error) =>
            notifyError(error, 'No se pudieron consultar las matrículas'),
    });
}
