import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mapToAppError } from '@/lib/api-errors';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import {
    newPasswordSchema,
    passwordConfirmationSchema,
    PASSWORDS_DIFFER_MESSAGE,
} from '@/lib/password';
import {
    type InvitationIdentity,
    useAcceptInvitation,
} from '../-hooks/use-accept-invitation';
import {
    InvitationAccountFields,
    type InvitationAccountValues,
} from './InvitationAccountFields';

function buildSchema(identity: InvitationIdentity) {
    if (identity.account) {
        return z.object({
            password: z.string().min(1, 'Ingresá tu contraseña.'),
            password_confirmation: z.string(),
            code: identity.account.two_factor
                ? z.string().min(1, 'Ingresá el código de tu app.')
                : z.string(),
        });
    }

    return z
        .object({
            password: newPasswordSchema,
            password_confirmation: passwordConfirmationSchema,
            code: z.string(),
        })
        .refine((v) => v.password === v.password_confirmation, {
            path: ['password_confirmation'],
            message: PASSWORDS_DIFFER_MESSAGE,
        });
}

type InvitationAccountStepProps = {
    token: string;
    identity: InvitationIdentity;
    /** Back to the DNI: what it found is gone (another account took it meanwhile). */
    onRestart: () => void;
};

// The second step of a professional invitation (#417): the registry's name,
// read-only, and the password: a new account's, or the existing one's (and its
// second factor) when the DNI or the invited email already has an account.
export function InvitationAccountStep({
    token,
    identity,
    onRestart,
}: InvitationAccountStepProps) {
    const nameId = useId();
    const { mutateAsync } = useAcceptInvitation(token);
    const form = useForm<InvitationAccountValues>({
        resolver: zodResolver(buildSchema(identity)),
        defaultValues: { password: '', password_confirmation: '', code: '' },
    });

    async function onSubmit(values: InvitationAccountValues) {
        try {
            await mutateAsync(
                identity.account
                    ? {
                          password: values.password,
                          ...(values.code ? { code: values.code } : {}),
                      }
                    : {
                          password: values.password,
                          password_confirmation: values.password_confirmation,
                      },
            );
        } catch (error) {
            const appError = mapToAppError(error);

            if (
                appError.kind === 'business' &&
                appError.code === 'memberships.invitation_document_required'
            ) {
                onRestart();
                return;
            }

            applyFormErrors(form, extractFormErrors(error), {
                password: 'password',
                password_confirmation: 'password_confirmation',
                code: 'code',
            });
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                    <Label htmlFor={nameId}>Nombre</Label>
                    <Input
                        id={nameId}
                        value={identity.name}
                        readOnly
                        aria-describedby={`${nameId}-source`}
                    />
                    <p
                        id={`${nameId}-source`}
                        className="text-sm text-muted-foreground"
                    >
                        Así figura en el Buscador Nacional de Profesionales de
                        la Salud. Si hay un error, comunicate con el soporte de
                        Clini.
                    </p>
                </div>

                {identity.account && (
                    <p className="rounded-md border bg-muted p-3 text-sm">
                        Ya tenés una cuenta en Clini con este DNI (
                        {identity.account.email}). Ingresá su contraseña para
                        sumar este consultorio a esa cuenta.
                    </p>
                )}

                {form.formState.errors.root && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </div>
                )}

                <InvitationAccountFields
                    control={form.control}
                    account={identity.account}
                />

                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                >
                    {form.formState.isSubmitting
                        ? 'Confirmando…'
                        : identity.account
                          ? 'Aceptar invitación'
                          : 'Crear cuenta y unirme'}
                </Button>
            </form>
        </Form>
    );
}
