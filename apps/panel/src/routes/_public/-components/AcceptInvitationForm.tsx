import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { extractFormErrors } from '@/lib/form-errors';
import {
    useAcceptInvitation,
    useInvitationInfo,
} from '../-hooks/use-accept-invitation';
import { AcceptInvitationRegistrationFields } from './AcceptInvitationRegistrationFields';

const GENERIC_ERROR_MESSAGE =
    'La invitación no es válida o ya expiró. Pedile a quien te invitó que te envíe una nueva.';

function infoErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string } | undefined;

        if (data?.message) {
            return data.message;
        }
    }

    return GENERIC_ERROR_MESSAGE;
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
            const { message, errors } = extractFormErrors(submitError);

            for (const field of Object.keys(
                values,
            ) as (keyof AcceptInvitationFormValues)[]) {
                if (errors[field]) {
                    form.setError(field, { message: errors[field] });
                }
            }
            if (message) {
                form.setError('root', { message });
            }
        }
    }

    if (isPending) {
        return <p className="text-sm text-muted-foreground">Cargando…</p>;
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
