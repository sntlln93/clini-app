import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import { sessionQueryOptions } from '@/lib/session';
import {
    blockingOrganizations,
    useDeleteAccount,
} from '../-hooks/use-delete-account';
import {
    deleteAccountSchema,
    type DeleteAccountValues,
} from './delete-account-schema';
import { DeleteAccountRefusal } from './DeleteAccountRefusal';
import { DeleteAccountSecondFactorField } from './DeleteAccountSecondFactorField';

type DeleteAccountFormProps = {
    twoFactorEnabled: boolean;
    onCancel: () => void;
};

/** Confirms the deletion with the password and, with it on, the second factor (#384). */
export function DeleteAccountForm({
    twoFactorEnabled,
    onCancel,
}: DeleteAccountFormProps) {
    const [useRecovery, setUseRecovery] = useState(false);
    // The organizations the last refusal named, listed under its message.
    const [blockedBy, setBlockedBy] = useState<string[]>([]);
    const form = useForm<DeleteAccountValues>({
        resolver: zodResolver(
            deleteAccountSchema(twoFactorEnabled, useRecovery),
        ),
        defaultValues: { password: '', code: '' },
    });
    const { mutateAsync } = useDeleteAccount();
    const refreshPageData = useRefreshPageData();

    async function submit({ password, code }: DeleteAccountValues) {
        setBlockedBy([]);
        try {
            await mutateAsync({
                password,
                ...(twoFactorEnabled &&
                    (useRecovery ? { recovery_code: code } : { code })),
            });
        } catch (error) {
            setBlockedBy(blockingOrganizations(error));
            const errors = extractFormErrors(error, {
                'auth.two_factor_code_invalid': 'code',
            });
            // Without the field on screen, the code's error goes to the top.
            applyFormErrors(
                form,
                errors,
                twoFactorEnabled
                    ? {
                          password: 'password',
                          code: 'code',
                          recovery_code: 'code',
                      }
                    : { password: 'password' },
            );
            // The factor was turned on since this page loaded: the reloaded
            // session brings the field; if it fails, the message still says why.
            if (!twoFactorEnabled && 'code' in errors.errors) {
                await refreshPageData(sessionQueryOptions.queryKey).catch(
                    () => undefined,
                );
            }
        }
    }

    function toggleRecovery() {
        setUseRecovery((current) => !current);
        form.resetField('code');
    }

    const isSubmitting = form.formState.isSubmitting;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="grid gap-4">
                {form.formState.errors.root?.message && (
                    <DeleteAccountRefusal
                        message={form.formState.errors.root.message}
                        organizations={blockedBy}
                    />
                )}
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        type="password"
                                        autoComplete="current-password"
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {twoFactorEnabled && (
                    <DeleteAccountSecondFactorField
                        control={form.control}
                        useRecovery={useRecovery}
                        onToggleRecovery={toggleRecovery}
                    />
                )}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="destructive"
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Spinner data-icon="inline-start" />}
                        Eliminar mi cuenta
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
