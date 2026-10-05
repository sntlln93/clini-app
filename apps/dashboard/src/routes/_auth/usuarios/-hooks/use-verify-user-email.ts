import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { AdminUserDetail } from '@/types/user';
import { useMutation } from '@tanstack/react-query';
import { USER_MODERATION_KEYS } from './user-moderation-keys';

export function useVerifyUserEmail(userId: number) {
    const refresh = useRefreshPageData();

    return useMutation({
        mutationFn: () =>
            api
                .post<{ data: AdminUserDetail }>(
                    `/admin/users/${userId}/email-verification`,
                )
                .then((response) => response.data.data),
        onSuccess: () => {
            notifySuccess('Correo verificado');
            return refresh(...USER_MODERATION_KEYS);
        },
        onError: (error) =>
            notifyError(error, 'No pudimos verificar el correo.'),
    });
}
