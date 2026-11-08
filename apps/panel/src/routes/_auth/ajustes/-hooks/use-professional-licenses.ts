import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { withMinimumDuration } from '@/lib/minimum-duration';
import { discardPageData } from '@/lib/page-data';
import { sessionQueryOptions } from '@/lib/session';
import { notifyError, notifySuccess } from '@/lib/toast';
import type {
    ProfessionalDocument,
    ProfessionalLicense,
} from '@/types/professional-license';
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
            .get<{ data: ProfessionalDocument }>('/me/professional-document')
            .then((response) => response.data.data),
});

// Every write may change the licenses (a lookup brings the registry's ones),
// so each one reloads both reads of the page. A status also decides which
// specialties the licenses back (#387): Ajustes › Profesionales and the member
// cards read that only in their loaders (#273). Loading the DNI also names the
// account after the registry (#417): the session (the header), every member
// list, the professional roster and the reports read that name.
function useRefreshLicenses({ renamed = false } = {}) {
    const queryClient = useQueryClient();
    const refreshPageData = useRefreshPageData();

    return () => {
        discardPageData(
            queryClient,
            BACKED_SPECIALTIES_KEY,
            ...(renamed
                ? [['memberships'], ['professionals'], ['reports']]
                : [['memberships', 'cards']]),
        );

        return renamed
            ? refreshPageData(
                  LICENSES_KEY,
                  DOCUMENT_KEY,
                  sessionQueryOptions.queryKey,
              )
            : refreshPageData(LICENSES_KEY, DOCUMENT_KEY);
    };
}

export function useUpdateProfessionalDocument() {
    const refresh = useRefreshLicenses({ renamed: true });

    return useMutation({
        // The DNI is looked up right away (RegistryProgress).
        mutationFn: (documentNumber: string) =>
            withMinimumDuration(
                api.put('/me/professional-document', {
                    document_number: documentNumber,
                }),
                REGISTRY_PROGRESS_MIN_MS,
            ),
        onSuccess: () => refresh().then(() => notifySuccess('DNI guardado')),
        onError: (error) => notifyError(error, 'No se pudo guardar el DNI'),
    });
}

/** Adds to Clini a license the registry holds for the DNI (#387). */
export function useAddLicenseToClini() {
    const refresh = useRefreshLicenses();

    return useMutation({
        mutationFn: (licenseId: number) =>
            api.put(`/me/licenses/${licenseId}/clini`),
        onSuccess: () =>
            refresh().then(() => notifySuccess('Matrícula agregada a Clini')),
        onError: (error) =>
            notifyError(error, 'No se pudo agregar la matrícula'),
    });
}

/** Takes a license out of Clini: it goes back to what the registry holds. */
export function useRemoveLicenseFromClini() {
    const refresh = useRefreshLicenses();

    return useMutation({
        mutationFn: (licenseId: number) =>
            api.delete(`/me/licenses/${licenseId}/clini`),
        onSuccess: () =>
            refresh().then(() => notifySuccess('Matrícula quitada de Clini')),
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
