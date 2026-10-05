import { refreshPageData } from '@/lib/page-data';
import type { QueryKey } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';

export function useRefreshPageData() {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useCallback(
        (...queryKeys: QueryKey[]) =>
            refreshPageData(queryClient, router, ...queryKeys),
        [queryClient, router],
    );
}
