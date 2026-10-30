import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';

const passwordSchema = z.object({
    password: z.string().min(1, 'Ingresá tu contraseña.'),
});

type PasswordValues = z.infer<typeof passwordSchema>;

type TwoFactorPasswordFormProps = {
    submitLabel: string;
    submitVariant?: 'default' | 'destructive';
    onCancel: () => void;
    /** Rejects with the request error: a wrong password lands on the field. */
    onSubmit: (password: string) => Promise<unknown>;
};

/** Confirms the current password before a change to the second factor (#357). */
export function TwoFactorPasswordForm({
    submitLabel,
    submitVariant = 'default',
    onCancel,
    onSubmit,
}: TwoFactorPasswordFormProps) {
    const form = useForm<PasswordValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { password: '' },
    });

    async function submit({ password }: PasswordValues) {
        try {
            await onSubmit(password);
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {
                password: 'password',
            });
        }
    }

    const isSubmitting = form.formState.isSubmitting;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="grid gap-4">
                {form.formState.errors.root && (
                    <p role="alert" className="text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </p>
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
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant={submitVariant}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Spinner data-icon="inline-start" />}
                        {submitLabel}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
