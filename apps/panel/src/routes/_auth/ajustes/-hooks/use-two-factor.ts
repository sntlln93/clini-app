import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { sessionQueryOptions } from '@/lib/session';
import { useMutation } from '@tanstack/react-query';

/** What an authenticator app needs to add the account (#357). */
export type TwoFactorSetup = {
    secret: string;
    provisioning_uri: string;
    qr_code_svg: string;
};

type RecoveryCodes = { recovery_codes: string[] };

/** Stores a new secret, still off until a code confirms it. Asks for the password. */
export function useStartTwoFactorSetup() {
    return useMutation({
        mutationFn: (password: string) =>
            api
                .post<{ data: TwoFactorSetup }>('/me/two-factor', { password })
                .then((response) => response.data.data),
    });
}

/** Turns the factor on and answers the recovery codes, the only time they are shown. */
export function useConfirmTwoFactorSetup() {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (code: string) =>
            api
                .post<{
                    data: RecoveryCodes;
                }>('/me/two-factor/confirmation', { code })
                .then((response) => response.data.data.recovery_codes),
        onSuccess: () => refreshPageData(sessionQueryOptions.queryKey),
    });
}

export function useDisableTwoFactor() {
    const refreshPageData = useRefreshPageData();

    return useMutation({
        mutationFn: (password: string) =>
            api.delete('/me/two-factor', { data: { password } }),
        onSuccess: () => refreshPageData(sessionQueryOptions.queryKey),
    });
}

/** Replaces every recovery code, so the old ones stop working. */
export function useRegenerateRecoveryCodes() {
    return useMutation({
        mutationFn: (password: string) =>
            api
                .post<{
                    data: RecoveryCodes;
                }>('/me/two-factor/recovery-codes', { password })
                .then((response) => response.data.data.recovery_codes),
    });
}
