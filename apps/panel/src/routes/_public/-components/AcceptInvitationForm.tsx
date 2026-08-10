import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ListSkeleton } from '@/components/ListSkeleton';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { mapToAppError } from '@/lib/api-errors';
import { messageForAppError } from '@/lib/error-codes';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import {
    useAcceptInvitation,
    useInvitationInfo,
} from '../-hooks/use-accept-invitation';
import { AcceptInvitationRegistrationFields } from './AcceptInvitationRegistrationFields';

function infoErrorMessage(error: unknown): string {
    return messageForAppError(mapToAppError(error));
}

export type AcceptInvitationFormValues = {
    name: string;
    password: string;
    password_confirmation: string;
};

function buildSchema(requiresRegistration: boolean) {
    if (!requiresRegistration) {
        return z.object({
            name: z.string(),
            password: z.string(),
            password_confirmation: z.string(),
        });
    }

    return z
        .object({
            name: z.string().min(1, 'El nombre es obligatorio.'),
            password: z.string().min(1, 'La contraseña es obligatoria.'),
            password_confirmation: z.string().min(1, 'Confirmá tu contraseña.'),
        })
        .refine((v) => v.password === v.password_confirmation, {
            path: ['password_confirmation'],
            message: 'Las contraseñas no coinciden.',
        });
}

type AcceptInvitationFormProps = {
    token: string;
};

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
    const {
        data: invitation,
        isPending,
        isError,
        error,
    } = useInvitationInfo(token);
    const { mutateAsync } = useAcceptInvitation(token);
    const requiresRegistration = invitation?.requires_registration ?? false;

    const form = useForm<AcceptInvitationFormValues>({
        resolver: zodResolver(buildSchema(requiresRegistration)),
        defaultValues: { name: '', password: '', password_confirmation: '' },
    });

    async function onSubmit(values: AcceptInvitationFormValues) {
        try {
            await mutateAsync(requiresRegistration ? values : {});
        } catch (submitError) {
            const fields = Object.keys(
                values,
            ) as (keyof AcceptInvitationFormValues)[];
            const fieldMap = Object.fromEntries(
                fields.map((field) => [field, field] as const),
            );

            applyFormErrors(form, extractFormErrors(submitError), fieldMap);
        }
    }

    if (isPending) {
        return <ListSkeleton />;
    }

    if (isError || !invitation) {
        return (
            <p className="text-sm text-destructive">
                {infoErrorMessage(error)}
            </p>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1 text-center">
                    <h1 className="text-2xl font-semibold">Unirte a Clini</h1>
                    <p className="text-sm text-muted-foreground">
                        {invitation.organization_name
                            ? `Te invitaron a sumarte a ${invitation.organization_name} (${invitation.email}).`
                            : `Te invitaron a sumarte con ${invitation.email}.`}
                    </p>
                </div>

                {form.formState.errors.root && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </div>
                )}

                {invitation.requires_registration && (
                    <AcceptInvitationRegistrationFields
                        control={form.control}
                    />
                )}

                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                >
                    {form.formState.isSubmitting
                        ? 'Confirmando…'
                        : invitation.requires_registration
                          ? 'Crear cuenta y unirme'
                          : 'Aceptar invitación'}
                </Button>
            </form>
        </Form>
    );
}
