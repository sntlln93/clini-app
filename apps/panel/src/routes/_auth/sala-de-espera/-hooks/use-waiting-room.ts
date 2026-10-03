import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import type { Appointment } from '@/types/appointment';
import { queryOptions } from '@tanstack/react-query';
import { useEffect } from 'react';

export const WAITING_ROOM_REFRESH_MS = 30_000;

type WaitingRoomRange = { from: string; to: string };

// Under the `appointments` prefix so the agenda's mutations (e.g. check-in) refresh it too.
export function waitingRoomQueryKey(range: WaitingRoomRange) {
    return ['appointments', 'waiting-room', range.from, range.to];
}

// Page read (ADR 0007): consumed from the `sala-de-espera` route loader only.
export function waitingRoomQueryOptions(range: WaitingRoomRange) {
    return queryOptions({
        queryKey: waitingRoomQueryKey(range),
        queryFn: () =>
            api
                .get<{ data: Appointment[] }>('/appointments', {
                    params: {
                        from: range.from,
                        to: range.to,
                        status: 'arrived',
                    },
                })
                .then((response) => response.data.data),
    });
}

/** Re-runs the page loader against fresh data on a fixed interval, so check-ins show up without a manual reload. */
export function useWaitingRoomAutoRefresh(
    intervalMs: number = WAITING_ROOM_REFRESH_MS,
) {
    const refreshPageData = useRefreshPageData();

    useEffect(() => {
        const id = window.setInterval(() => {
            void refreshPageData(['appointments', 'waiting-room']);
        }, intervalMs);

        return () => window.clearInterval(id);
    }, [refreshPageData, intervalMs]);
}
