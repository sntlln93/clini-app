import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { AdminUserDetail } from '@/types/user';
import { useMutation } from '@tanstack/react-query';
import { USER_MODERATION_KEYS } from './user-moderation-keys';

export function useUnblockUser(userId: number) {
    const refresh = useRefreshPageData();

    return useMutation({
        mutationFn: () =>
            api
                .delete<{ data: AdminUserDetail }>(
                    `/admin/users/${userId}/block`,
                )
                .then((response) => response.data.data),
        onSuccess: () => {
            notifySuccess('Usuario desbloqueado');
            return refresh(...USER_MODERATION_KEYS);
        },
        onError: (error) =>
            notifyError(error, 'No pudimos desbloquear al usuario.'),
    });
}
