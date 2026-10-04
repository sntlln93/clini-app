import { api } from '@/lib/api';
import { navigateToExternalUrl } from '@/lib/external-navigation';
import { notifyError } from '@/lib/toast';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Starts (or resumes) the Mercado Pago checkout and leaves the panel for it.
 * Navigates away on success, so no page data needs refreshing: the
 * subscription is read again when the checkout returns to Ajustes.
 *
 * `isRedirecting` stays true from the click until the page unloads — a
 * successful mutation keeps it, since the browser is still loading the
 * checkout — and only an error clears it. Coming back to a page restored
 * from the back-forward cache resets it, so the button isn't stuck.
 */
export function useStartSubscription() {
    const mutation = useMutation({
        mutationFn: () =>
            api
                .post<{ data: { init_point: string } }>('/subscription')
                .then((response) => response.data.data.init_point),
        onSuccess: (initPoint) => navigateToExternalUrl(initPoint),
        onError: (error) =>
            notifyError(error, 'No se pudo iniciar el pago de la suscripción'),
    });
    const { reset } = mutation;

    useEffect(() => {
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                reset();
            }
        };

        window.addEventListener('pageshow', onPageShow);

        return () => window.removeEventListener('pageshow', onPageShow);
    }, [reset]);

    return {
        start: () => mutation.mutate(),
        isRedirecting: mutation.isPending || mutation.isSuccess,
    };
}
