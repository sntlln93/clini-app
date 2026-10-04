import { api } from '@/lib/api';
import { navigateToExternalUrl } from '@/lib/external-navigation';
import { notifyError } from '@/lib/toast';
import { useMutation } from '@tanstack/react-query';

/**
 * Starts (or resumes) the Mercado Pago checkout and leaves the panel for it.
 * Navigates away on success, so no page data needs refreshing: the
 * subscription is read again when the checkout's back_url lands on Ajustes.
 */
export function useStartSubscription() {
    return useMutation({
        mutationFn: () =>
            api
                .post<{ data: { init_point: string } }>('/subscription')
                .then((response) => response.data.data.init_point),
        onSuccess: (initPoint) => navigateToExternalUrl(initPoint),
        onError: (error) =>
            notifyError(error, 'No se pudo iniciar el pago de la suscripción'),
    });
}
