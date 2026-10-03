import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useWaitingRoomAutoRefresh,
    WAITING_ROOM_REFRESH_MS,
} from '../-hooks/use-waiting-room';

const refreshPageData = vi.fn(() => Promise.resolve());
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refreshPageData,
}));

describe('useWaitingRoomAutoRefresh', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        refreshPageData.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('refreshes the waiting-room page data every interval and stops on unmount', () => {
        const { unmount } = renderHook(() => useWaitingRoomAutoRefresh());

        expect(refreshPageData).not.toHaveBeenCalled();

        vi.advanceTimersByTime(WAITING_ROOM_REFRESH_MS);
        expect(refreshPageData).toHaveBeenCalledTimes(1);
        expect(refreshPageData).toHaveBeenCalledWith([
            'appointments',
            'waiting-room',
        ]);

        vi.advanceTimersByTime(WAITING_ROOM_REFRESH_MS);
        expect(refreshPageData).toHaveBeenCalledTimes(2);

        unmount();
        vi.advanceTimersByTime(WAITING_ROOM_REFRESH_MS * 3);
        expect(refreshPageData).toHaveBeenCalledTimes(2);
    });

    it('defaults to roughly a 30 second interval', () => {
        expect(WAITING_ROOM_REFRESH_MS).toBe(30_000);
    });
});
