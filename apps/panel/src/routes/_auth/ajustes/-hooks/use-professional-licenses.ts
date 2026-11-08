import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { withMinimumDuration } from '@/lib/minimum-duration';
import { discardPageData } from '@/lib/page-data';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { ProfessionalLicense } from '@/types/professional-license';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import { REGISTRY_PROGRESS_MIN_MS } from '../-components/RegistryProgress';
import { BACKED_SPECIALTIES_KEY } from './use-backed-specialties';

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
// each one reloads both reads of the page. A status also decides which
// specialties the licenses back (#387): Ajustes › Profesionales and the member
// cards read that only in their loaders (#273).
function useRefreshLicenses() {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();

    return () => {
        discardPageData(queryClient, BACKED_SPECIALTIES_KEY, [
            'memberships',
            'cards',
        ]);

        return refreshPageData(LICENSES_KEY, DOCUMENT_KEY);
    };
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
        // The lookup walks the user through its steps (RegistryProgress).
        mutationFn: (license: NewProfessionalLicense) =>
            withMinimumDuration(
                api.post('/me/licenses', license),
                REGISTRY_PROGRESS_MIN_MS,
            ),
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
        mutationFn: () =>
            withMinimumDuration(
                api.post('/me/licenses/verification'),
                REGISTRY_PROGRESS_MIN_MS,
            ),
        onSuccess: () =>
            refresh().then(() => notifySuccess('Matrículas consultadas')),
        onError: (error) =>
            notifyError(error, 'No se pudieron consultar las matrículas'),
    });
}
