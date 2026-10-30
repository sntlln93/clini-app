import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
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
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import {
    restartMessageFor,
    useTwoFactorChallenge,
} from '../-hooks/use-two-factor-challenge';

const codeSchema = z.object({
    value: z
        .string()
        .trim()
        .regex(/^\d{3} ?\d{3}$/, 'El código tiene 6 números.'),
});

const recoverySchema = z.object({
    value: z.string().trim().min(1, 'Ingresá un código de recuperación.'),
});

type ChallengeValues = { value: string };

const CODE_INPUT = {
    inputMode: 'numeric',
    autoComplete: 'one-time-code',
    maxLength: 7,
} as const;

const RECOVERY_INPUT = {
    autoComplete: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
} as const;

type TwoFactorChallengeFormProps = {
    redirectTo?: string;
    /** The pending login is gone (expired, or the factor was turned off): back to the password. */
    onRestart: (message: string) => void;
};

export function TwoFactorChallengeForm({
    redirectTo,
    onRestart,
}: TwoFactorChallengeFormProps) {
    const [useRecovery, setUseRecovery] = useState(false);
    const form = useForm<ChallengeValues>({
        resolver: zodResolver(useRecovery ? recoverySchema : codeSchema),
        defaultValues: { value: '' },
    });
    const { mutateAsync } = useTwoFactorChallenge(redirectTo);

    // The step replaces the password form: focus follows it to the new field.
    useEffect(() => {
        form.setFocus('value');
    }, [form, useRecovery]);

    async function onSubmit({ value }: ChallengeValues) {
        try {
            await mutateAsync(
                useRecovery ? { recovery_code: value } : { code: value },
            );
        } catch (error) {
            const restartMessage = restartMessageFor(error);
            if (restartMessage) {
                onRestart(restartMessage);
                return;
            }
            applyFormErrors(
                form,
                extractFormErrors(error, {
                    'auth.two_factor_code_invalid': 'value',
                }),
                { value: 'value', code: 'value', recovery_code: 'value' },
            );
        }
    }

    function toggleRecovery() {
        setUseRecovery((current) => !current);
        form.reset({ value: '' });
    }

    const isSubmitting = form.formState.isSubmitting;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1 text-center">
                    <h1 className="text-2xl tracking-tight">
                        Verificación en dos pasos
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {useRecovery
                            ? 'Ingresá uno de los códigos de recuperación que guardaste. Cada uno sirve una sola vez.'
                            : 'Ingresá el código de 6 números que muestra tu app de autenticación.'}
                    </p>
                </div>

                {form.formState.errors.root && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {useRecovery
                                    ? 'Código de recuperación'
                                    : 'Código de verificación'}
                            </FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        key={useRecovery ? 'recovery' : 'code'}
                                        {...(useRecovery
                                            ? RECOVERY_INPUT
                                            : CODE_INPUT)}
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting && <Spinner data-icon="inline-start" />}
                    Verificar
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={toggleRecovery}
                >
                    {useRecovery
                        ? 'Usar el código de la app'
                        : 'Usar un código de recuperación'}
                </Button>
            </form>
        </Form>
    );
}
