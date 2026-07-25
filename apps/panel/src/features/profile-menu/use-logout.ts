import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

export function useLogout() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: () => api.post('/logout'),
        onSettled: () => {
            queryClient.clear();
            navigate({ to: '/login' });
        },
    });
}
