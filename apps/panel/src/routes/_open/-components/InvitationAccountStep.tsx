import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mapToAppError } from '@/lib/api-errors';
import { messageForAppError } from '@/lib/error-codes';
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
            // Only an account with a second factor needs it; the API says so.
            code: z.string(),
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

// What the DNI found is gone: it has to be looked up again.
const RESTART_CODES = new Set([
    'memberships.invitation_document_required',
    'professionals.document_taken',
]);

type InvitationAccountStepProps = {
    token: string;
    identity: InvitationIdentity;
    /** Back to the DNI, saying why: what it found is gone (another account took it meanwhile). */
    onRestart: (reason: string) => void;
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
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
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
                          ...(values.code
                              ? useRecoveryCode
                                  ? { recovery_code: values.code }
                                  : { code: values.code }
                              : {}),
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
                RESTART_CODES.has(appError.code)
            ) {
                onRestart(messageForAppError(appError));
                return;
            }

            applyFormErrors(form, extractFormErrors(error), {
                password: 'password',
                password_confirmation: 'password_confirmation',
                code: 'code',
                recovery_code: 'code',
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
                        {identity.account.has_document
                            ? `Ya tenés una cuenta en Clini con este DNI (${identity.account.email}). Ingresá su contraseña para sumar este consultorio a esa cuenta.`
                            : `Ya tenés una cuenta en Clini con el mail invitado (${identity.account.email}). Ingresá su contraseña para cargarle este DNI y sumar este consultorio; su nombre pasa a ser el del Buscador.`}
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
                    useRecoveryCode={useRecoveryCode}
                    onToggleRecoveryCode={() =>
                        setUseRecoveryCode((current) => !current)
                    }
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
