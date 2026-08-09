import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { extractFormErrors } from '@/lib/form-errors';
import { useRegister } from '../-hooks/use-register';
import { RegisterFormFields } from './RegisterFormFields';

const registerSchema = z
    .object({
        name: z.string().min(1, 'El nombre es obligatorio.'),
        organization_name: z
            .string()
            .min(1, 'El nombre del consultorio es obligatorio.'),
        email: z
            .string()
            .min(1, 'El correo es obligatorio.')
            .email('El correo no es válido.'),
        password: z.string().min(1, 'La contraseña es obligatoria.'),
        password_confirmation: z.string(),
    })
    .refine((v) => v.password === v.password_confirmation, {
        path: ['password_confirmation'],
        message: 'Las contraseñas no coinciden.',
    });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: '',
            organization_name: '',
            email: '',
            password: '',
            password_confirmation: '',
        },
    });
    const { mutateAsync } = useRegister();

    async function onSubmit(values: RegisterFormValues) {
        try {
            await mutateAsync(values);
        } catch (error) {
            const { message, errors } = extractFormErrors(error);

            for (const field of Object.keys(
                values,
            ) as (keyof RegisterFormValues)[]) {
                if (errors[field]) {
                    form.setError(field, { message: errors[field] });
                }
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
                    <h1 className="text-2xl font-semibold">Crear cuenta</h1>
                    <p className="text-sm text-muted-foreground">
                        Registrá tu consultorio en Clini
                    </p>
                </div>

                {form.formState.errors.root && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </div>
                )}

                <RegisterFormFields control={form.control} />

                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                >
                    {form.formState.isSubmitting
                        ? 'Creando cuenta…'
                        : 'Crear cuenta'}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    ¿Ya tenés cuenta?{' '}
                    <Link
                        to="/login"
                        // Inline link is exempt from the 44px coarse-pointer touch target per WCAG 2.5.8's inline exception (see `.touch-target-exempt` in index.css).
                        className="touch-target-exempt font-medium text-foreground underline underline-offset-4"
                    >
                        Iniciá sesión
                    </Link>
                </p>
            </form>
        </Form>
    );
}
