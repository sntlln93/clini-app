import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { notifyError, notifySuccess } from '@/lib/toast';
import { useMutation } from '@tanstack/react-query';

/**
 * Cancels the subscription at Mercado Pago (`DELETE /subscription`, owner
 * only). The owner stays on Ajustes, and the banner and every read-only
 * check observe the same cached subscription, so it is refreshed on success.
 */
export function useCancelSubscription() {
    const refresh = useRefreshPageData();

    const mutation = useMutation({
        mutationFn: () => api.delete('/subscription'),
        onSuccess: () => {
            notifySuccess('Cancelaste la suscripción');

            return refresh(subscriptionQueryOptions.queryKey);
        },
        onError: (error) =>
            notifyError(error, 'No se pudo cancelar la suscripción'),
    });

    return {
        cancel: () => mutation.mutate(),
        isCancelling: mutation.isPending,
    };
}
