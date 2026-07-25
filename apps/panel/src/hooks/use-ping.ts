import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function usePing() {
    return useQuery({
        queryKey: ['ping'],
        queryFn: async () => {
            const { data } = await api.get<{ status: string }>('/ping');
            return data;
        },
    });
}
