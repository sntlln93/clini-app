import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
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
import { NewPasswordFields } from '@/features/new-password/NewPasswordFields';
import { mapToAppError } from '@/lib/api-errors';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import {
    newPasswordSchema,
    passwordConfirmationSchema,
    PASSWORDS_DIFFER_MESSAGE,
} from '@/lib/password';
import { useResetPassword } from '../-hooks/use-reset-password';

const resetPasswordSchema = z
    .object({
        email: z
            .string()
            .min(1, 'El correo es obligatorio.')
            .email('El correo no es válido.'),
        password: newPasswordSchema,
        password_confirmation: passwordConfirmationSchema,
    })
    .refine((v) => v.password === v.password_confirmation, {
        path: ['password_confirmation'],
        message: PASSWORDS_DIFFER_MESSAGE,
    });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

type ResetPasswordFormProps = {
    token: string;
};

/**
 * The page the reset mail links to (#389), open with or without a session.
 * The link carries the token alone, so the address is typed again here and
 * never travels in a URL.
 */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { email: '', password: '', password_confirmation: '' },
    });
    const { mutateAsync } = useResetPassword();
    // Only a spent, expired or mismatched link calls for a new one.
    const [linkRejected, setLinkRejected] = useState(false);

    async function onSubmit(values: ResetPasswordValues) {
        setLinkRejected(false);
        try {
            await mutateAsync({ ...values, token });
        } catch (error) {
            const appError = mapToAppError(error);
            setLinkRejected(
                appError.kind === 'business' &&
                    appError.code === 'auth.password_reset_invalid_or_expired',
            );
            applyFormErrors(form, extractFormErrors(error), {
                email: 'email',
                password: 'password',
                password_confirmation: 'password_confirmation',
            });
        }
    }

    const rootMessage = form.formState.errors.root?.message;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1 text-center">
                    <h1 className="text-2xl tracking-tight">
                        Elegí una contraseña nueva
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Al cambiarla se cierran todas las sesiones abiertas de
                        tu cuenta
                    </p>
                </div>

                {rootMessage && (
                    <div
                        role="alert"
                        className="space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                        <p>{rootMessage}</p>
                        {linkRejected && (
                            <Link
                                to="/recuperar-contrasena"
                                // Inline link is exempt from the 44px coarse-pointer touch target per WCAG 2.5.8's inline exception (see `.touch-target-exempt` in index.css).
                                className="touch-target-exempt font-medium underline underline-offset-4"
                            >
                                Pedir un enlace nuevo
                            </Link>
                        )}
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Correo electrónico</FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        type="email"
                                        autoComplete="username"
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <NewPasswordFields />

                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                >
                    {form.formState.isSubmitting && (
                        <Spinner data-icon="inline-start" />
                    )}
                    Cambiar contraseña
                </Button>
            </form>
        </Form>
    );
}
