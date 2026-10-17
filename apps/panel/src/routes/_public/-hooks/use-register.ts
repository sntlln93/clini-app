import { api } from '@/lib/api';
import { browserTimeZone } from '@/lib/datetime';
import { navigateToExternalUrl } from '@/lib/external-navigation';
import { extractFormErrors } from '@/lib/form-errors';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import {
    startSubscriptionCheckout,
    SUBSCRIPTION_SECTION_ID,
} from '@/lib/subscription';
import { notifyError } from '@/lib/toast';
import type { SubscriptionBilling } from '@/types/subscription';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { RegisterPlan } from '../-components/RegisterPlanField';

type RegisterPayload = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    organization_name: string;
    plan: RegisterPlan;
    billing: SubscriptionBilling;
};

/**
 * Every account is created on Free; choosing Consultorio (#286) then starts
 * the same Mercado Pago checkout as Ajustes, whose return lands there. A
 * checkout that fails to start leaves a working Free account, so the user
 * is sent to retry it from Ajustes instead of seeing a registration error.
 */
export function useRegister() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: async ({ plan, billing, ...payload }: RegisterPayload) => {
            const user = await api
                .post<SessionUser>('/register', {
                    ...payload,
                    timezone: browserTimeZone(),
                })
                .then((response) => response.data);
            queryClient.setQueryData(sessionQueryOptions.queryKey, user);

            if (plan === 'gratis') {
                await navigate({ to: '/agenda' });
                return 'agenda' as const;
            }

            try {
                navigateToExternalUrl(await startSubscriptionCheckout(billing));
                return 'checkout' as const;
            } catch (error) {
                notifyError(
                    error,
                    'Tu cuenta quedó creada en el plan Gratis, pero no se pudo iniciar el pago de Consultorio. Podés reintentarlo desde acá.',
                );
                await navigate({
                    to: '/ajustes',
                    hash: SUBSCRIPTION_SECTION_ID,
                });
                return 'ajustes' as const;
            }
        },
    });

    const { message, errors } = mutation.error
        ? extractFormErrors(mutation.error)
        : { message: null, errors: {} };

    return {
        ...mutation,
        message,
        errors,
        isRedirectingToCheckout: mutation.data === 'checkout',
    };
}
