import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
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
import { applyFormErrors } from '@/lib/form-errors';
import { loginFormErrors, useLogin } from '../-hooks/use-login';

const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo es obligatorio.')
        .email('El correo no es válido.'),
    password: z.string().min(1, 'La contraseña es obligatoria.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
    /** Internal path to return to after login; the overview when absent. */
    redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });
    const { mutateAsync } = useLogin(redirectTo);

    async function onSubmit(values: LoginFormValues) {
        try {
            await mutateAsync(values);
        } catch (error) {
            applyFormErrors(form, loginFormErrors(error), {
                email: 'email',
                password: 'password',
            });
        }
    }

    const isSubmitting = form.formState.isSubmitting;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ShieldCheck className="size-5" aria-hidden="true" />
                    </span>
                    <h1 className="text-2xl tracking-tight">Iniciar sesión</h1>
                    <p className="text-sm text-muted-foreground">
                        Panel de operación de Clini
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

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting && <Spinner data-icon="inline-start" />}
                    {isSubmitting ? 'Ingresando…' : 'Ingresar'}
                </Button>
            </form>
        </Form>
    );
}
