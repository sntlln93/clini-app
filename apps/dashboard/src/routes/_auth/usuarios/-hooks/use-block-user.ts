import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import type { AdminUserDetail } from '@/types/user';
import { useMutation } from '@tanstack/react-query';
import { USER_MODERATION_KEYS } from './user-moderation-keys';

export function useBlockUser(userId: number) {
    const refresh = useRefreshPageData();

    return useMutation({
        mutationFn: (reason: string) =>
            api
                .post<{ data: AdminUserDetail }>(
                    `/admin/users/${userId}/block`,
                    {
                        reason,
                    },
                )
                .then((response) => response.data.data),
        onSuccess: () => {
            notifySuccess('Usuario bloqueado');
            return refresh(...USER_MODERATION_KEYS);
        },
    });
}
