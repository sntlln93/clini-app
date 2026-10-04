import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    CHECKOUT_RETURN_MAX_POLLS,
    CHECKOUT_RETURN_POLL_MS,
    useCheckoutReturn,
} from '../-hooks/use-checkout-return';

const refresh = vi.fn(() => Promise.resolve());
const navigate = vi.fn(() => Promise.resolve());

vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));

vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => navigate,
}));

const STRIP_FLAG = { to: '/ajustes', search: {}, replace: true };

describe('useCheckoutReturn', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        refresh.mockClear();
        navigate.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does nothing when the page was not reached from the checkout', () => {
        const { result } = renderHook(() => useCheckoutReturn(false, true));

        vi.advanceTimersByTime(CHECKOUT_RETURN_POLL_MS * 3);

        expect(result.current).toBe(false);
        expect(refresh).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
    });

    it('refreshes the subscription on arrival and every few seconds while it is pending', () => {
        const { result } = renderHook(() => useCheckoutReturn(true, true));

        expect(result.current).toBe(true);
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(refresh).toHaveBeenCalledWith(['subscription']);

        vi.advanceTimersByTime(CHECKOUT_RETURN_POLL_MS * 2);

        expect(refresh).toHaveBeenCalledTimes(3);
        expect(navigate).not.toHaveBeenCalled();
    });

    it('stops polling and drops the flag from the URL once the payment resolves', () => {
        const { result, rerender } = renderHook(
            ({ pending }) => useCheckoutReturn(true, pending),
            { initialProps: { pending: true } },
        );

        vi.advanceTimersByTime(CHECKOUT_RETURN_POLL_MS);
        rerender({ pending: false });

        expect(result.current).toBe(false);
        expect(navigate).toHaveBeenCalledWith(STRIP_FLAG);

        const refreshes = refresh.mock.calls.length;
        vi.advanceTimersByTime(CHECKOUT_RETURN_POLL_MS * 5);
        expect(refresh).toHaveBeenCalledTimes(refreshes);
    });

    it('drops the flag right away when the subscription is no longer pending', () => {
        renderHook(() => useCheckoutReturn(true, false));

        expect(navigate).toHaveBeenCalledWith(STRIP_FLAG);
    });

    it('gives up after about two minutes, dropping the flag', () => {
        renderHook(() => useCheckoutReturn(true, true));

        vi.advanceTimersByTime(
            CHECKOUT_RETURN_POLL_MS * CHECKOUT_RETURN_MAX_POLLS,
        );
        expect(navigate).not.toHaveBeenCalled();
        expect(refresh).toHaveBeenCalledTimes(1 + CHECKOUT_RETURN_MAX_POLLS);

        vi.advanceTimersByTime(CHECKOUT_RETURN_POLL_MS);
        expect(navigate).toHaveBeenCalledWith(STRIP_FLAG);

        vi.advanceTimersByTime(CHECKOUT_RETURN_POLL_MS * 5);
        expect(refresh).toHaveBeenCalledTimes(1 + CHECKOUT_RETURN_MAX_POLLS);
    });
});
