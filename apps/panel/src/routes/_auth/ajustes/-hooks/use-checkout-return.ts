import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef } from 'react';

export const CHECKOUT_RETURN_POLL_MS = 5_000;
/** ~2 minutes of polling. */
export const CHECKOUT_RETURN_MAX_POLLS = 24;

/**
 * After the Mercado Pago checkout sends the browser back
 * (`?suscripcion=retorno`), the webhook may not have confirmed the payment
 * yet: refreshes the subscription right away, then every few seconds while
 * it is still pending, and drops the flag from the URL once it resolves (or
 * polling gives up). Returns whether the confirmation is still awaited.
 */
export function useCheckoutReturn(
    returning: boolean,
    pending: boolean,
): boolean {
    const refresh = useRefreshPageData();
    const navigate = useNavigate();
    const polls = useRef(0);

    const finish = useCallback(
        () => navigate({ to: '/ajustes', search: {}, replace: true }),
        [navigate],
    );

    useEffect(() => {
        if (returning) {
            void refresh(subscriptionQueryOptions.queryKey);
        }
    }, [returning, refresh]);

    useEffect(() => {
        if (!returning) {
            return;
        }

        if (!pending) {
            void finish();

            return;
        }

        const timer = window.setInterval(() => {
            polls.current += 1;

            if (polls.current > CHECKOUT_RETURN_MAX_POLLS) {
                window.clearInterval(timer);
                void finish();

                return;
            }

            void refresh(subscriptionQueryOptions.queryKey);
        }, CHECKOUT_RETURN_POLL_MS);

        return () => window.clearInterval(timer);
    }, [returning, pending, refresh, finish]);

    return returning && pending;
}
