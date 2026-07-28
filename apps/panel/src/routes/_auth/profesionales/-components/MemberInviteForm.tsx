import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';

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
import { useInviteMember } from '../-hooks/use-invite-member';
import { MemberRoleFields } from './MemberRoleFields';
import {
    inviteMemberSchema,
    type InviteMemberFormValues,
} from './member-schemas';

const DEFAULT_VALUES: InviteMemberFormValues = { email: '', roles: [] };

export function MemberInviteForm() {
    const { mutateAsync, isSuccess } = useInviteMember();

    const form = useForm<InviteMemberFormValues>({
        resolver: zodResolver(inviteMemberSchema),
        defaultValues: DEFAULT_VALUES,
    });

    async function onSubmit(values: InviteMemberFormValues) {
        try {
            await mutateAsync(values);
        } catch (error) {
            const { message, errors } = extractFormErrors(error);

            if (errors.email) {
                form.setError('email', { message: errors.email });
            }
            if (errors.roles) {
                form.setError('roles', { message: errors.roles });
            }
            if (message) {
                form.setError('root', { message });
            }
        }
    }

    if (isSuccess) {
        return (
            <div className="max-w-xl space-y-4">
                <p className="text-sm text-foreground">
                    Invitación enviada correctamente.
                </p>
                <Button
                    type="button"
                    render={<Link to="/profesionales" />}
                    nativeButton={false}
                >
                    Volver
                </Button>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="max-w-xl space-y-4"
            >
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
                                render={<Input type="email" {...field} />}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <MemberRoleFields control={form.control} name="roles" />

                <div className="flex gap-2">
                    <Button
                        type="submit"
                        disabled={form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting
                            ? 'Enviando…'
                            : 'Enviar invitación'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        render={<Link to="/profesionales" />}
                        nativeButton={false}
                    >
                        Cancelar
                    </Button>
                </div>
            </form>
        </Form>
    );
}
