import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
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
import { extractFormErrors } from '@/lib/form-errors';
import { useLogin } from '../-hooks/use-login';

const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo es obligatorio.')
        .email('El correo no es válido.'),
    password: z.string().min(1, 'La contraseña es obligatoria.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });
    const { mutateAsync } = useLogin();

    async function onSubmit(values: LoginFormValues) {
        try {
            await mutateAsync(values);
        } catch (error) {
            const { message, errors } = extractFormErrors(error);

            if (errors.email) {
                form.setError('email', { message: errors.email });
            }
            if (errors.password) {
                form.setError('password', { message: errors.password });
            }
            if (message) {
                form.setError('root', { message });
            }
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1 text-center">
                    <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
                    <p className="text-sm text-muted-foreground">
                        Ingresá tus datos para continuar
                    </p>
                </div>

                {form.formState.errors.root && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
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
                    disabled={form.formState.isSubmitting}
                >
                    {form.formState.isSubmitting ? 'Ingresando…' : 'Ingresar'}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    ¿No tenés cuenta?{' '}
                    <Link
                        to="/registro"
                        // Inline link is exempt from the 44px coarse-pointer touch target per WCAG 2.5.8's inline exception (see `.touch-target-exempt` in index.css).
                        className="touch-target-exempt font-medium text-foreground underline underline-offset-4"
                    >
                        Registrate
                    </Link>
                </p>
            </form>
        </Form>
    );
}
