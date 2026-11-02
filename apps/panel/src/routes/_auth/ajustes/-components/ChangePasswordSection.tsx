import { zodResolver } from '@hookform/resolvers/zod';
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
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import {
    newPasswordSchema,
    passwordConfirmationSchema,
    PASSWORDS_DIFFER_MESSAGE,
} from '@/lib/password';
import { notifySuccess } from '@/lib/toast';
import { useChangePassword } from '../-hooks/use-change-password';

const changePasswordSchema = z
    .object({
        current_password: z.string().min(1, 'Ingresá tu contraseña actual.'),
        password: newPasswordSchema,
        password_confirmation: passwordConfirmationSchema,
    })
    .refine((v) => v.password === v.password_confirmation, {
        path: ['password_confirmation'],
        message: PASSWORDS_DIFFER_MESSAGE,
    });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const EMPTY_VALUES: ChangePasswordValues = {
    current_password: '',
    password: '',
    password_confirmation: '',
};

/** The signed-in user's own password (#389), open to every clinic user. */
export function ChangePasswordSection() {
    const form = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: EMPTY_VALUES,
    });
    const { mutateAsync } = useChangePassword();

    async function onSubmit(values: ChangePasswordValues) {
        try {
            await mutateAsync(values);
            form.reset(EMPTY_VALUES);
            notifySuccess(
                'Cambiaste tu contraseña. Cerramos tus otras sesiones abiertas.',
            );
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {
                current_password: 'current_password',
                password: 'password',
                password_confirmation: 'password_confirmation',
            });
        }
    }

    const isSubmitting = form.formState.isSubmitting;

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Contraseña</h2>
                <p className="text-sm text-muted-foreground">
                    Al cambiarla, esta sesión sigue abierta y se cierran las
                    demás.
                </p>
            </div>

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="grid max-w-sm gap-4"
                >
                    {form.formState.errors.root && (
                        <p role="alert" className="text-sm text-destructive">
                            {form.formState.errors.root.message}
                        </p>
                    )}

                    <FormField
                        control={form.control}
                        name="current_password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contraseña actual</FormLabel>
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

                    <NewPasswordFields />

                    <div>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && (
                                <Spinner data-icon="inline-start" />
                            )}
                            Cambiar contraseña
                        </Button>
                    </div>
                </form>
            </Form>
        </section>
    );
}
