import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { OrganizationLogo } from '@/types/organization';
import { queryOptions, useMutation } from '@tanstack/react-query';

export const organizationLogoQueryOptions = queryOptions({
    queryKey: ['organization', 'logo'],
    queryFn: async () => {
        const response = await api.get<{ data: OrganizationLogo }>(
            '/organization/logo',
        );
        return response.data.data;
    },
});

export function useUploadOrganizationLogo() {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (file: File) => {
            const body = new FormData();
            body.append('logo', file);
            return api.post('/organization/logo', body);
        },
        onSuccess: () =>
            refreshPageData(organizationLogoQueryOptions.queryKey).then(() =>
                notifySuccess('Logo actualizado'),
            ),
        onError: (error) => notifyError(error, 'No se pudo subir el logo'),
    });
}

export function useRemoveOrganizationLogo() {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: () => api.delete('/organization/logo'),
        onSuccess: () =>
            refreshPageData(organizationLogoQueryOptions.queryKey).then(() =>
                notifySuccess('Logo eliminado'),
            ),
        onError: (error) => notifyError(error, 'No se pudo eliminar el logo'),
    });
}
