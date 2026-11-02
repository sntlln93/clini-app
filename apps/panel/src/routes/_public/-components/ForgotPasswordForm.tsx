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
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import { useRequestPasswordReset } from '../-hooks/use-password-reset';

const forgotPasswordSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo es obligatorio.')
        .email('El correo no es válido.'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/** Asks for a reset link by mail (#389); the answer never tells whether the address has an account. */
export function ForgotPasswordForm() {
    const [sent, setSent] = useState(false);
    const form = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    });
    const { mutateAsync } = useRequestPasswordReset();

    async function onSubmit({ email }: ForgotPasswordValues) {
        try {
            await mutateAsync(email);
            setSent(true);
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), { email: 'email' });
        }
    }

    if (sent) {
        return (
            <div className="space-y-4 text-center">
                <h1 className="text-2xl tracking-tight">Revisá tu correo</h1>
                <p role="status" className="text-sm text-muted-foreground">
                    Si hay una cuenta con ese correo, te enviamos un enlace para
                    elegir una contraseña nueva. Vence en 60 minutos.
                </p>
                <BackToLogin />
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1 text-center">
                    <h1 className="text-2xl tracking-tight">
                        Recuperar contraseña
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Te enviamos un enlace para elegir una nueva
                    </p>
                </div>

                {form.formState.errors.root && (
                    <div
                        role="alert"
                        className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                        {form.formState.errors.root.message}
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
                                        autoComplete="email"
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
                    disabled={form.formState.isSubmitting}
                >
                    {form.formState.isSubmitting && (
                        <Spinner data-icon="inline-start" />
                    )}
                    Enviar enlace
                </Button>

                <BackToLogin />
            </form>
        </Form>
    );
}

function BackToLogin() {
    return (
        <p className="text-center text-sm text-muted-foreground">
            ¿Te acordaste?{' '}
            <Link
                to="/login"
                // Inline link is exempt from the 44px coarse-pointer touch target per WCAG 2.5.8's inline exception (see `.touch-target-exempt` in index.css).
                className="touch-target-exempt font-medium text-foreground underline underline-offset-4"
            >
                Iniciá sesión
            </Link>
        </p>
    );
}
