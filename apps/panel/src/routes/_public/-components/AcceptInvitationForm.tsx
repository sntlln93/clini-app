import { Button } from '@/components/ui/button';
import axios from 'axios';
import { useState, type FormEvent } from 'react';
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

type AcceptInvitationFormProps = {
    token: string;
};

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const {
        data: invitation,
        isPending,
        isError,
        error,
    } = useInvitationInfo(token);
    const {
        mutate,
        isPending: isAccepting,
        message,
        errors,
    } = useAcceptInvitation(token);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!invitation) {
            return;
        }

        mutate(
            invitation.requires_registration
                ? {
                      name,
                      password,
                      password_confirmation: passwordConfirmation,
                  }
                : {},
        );
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold">Unirte a Clini</h1>
                <p className="text-sm text-muted-foreground">
                    {invitation.organization_name
                        ? `Te invitaron a sumarte a ${invitation.organization_name} (${invitation.email}).`
                        : `Te invitaron a sumarte con ${invitation.email}.`}
                </p>
            </div>

            {message && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {message}
                </div>
            )}

            {invitation.requires_registration && (
                <AcceptInvitationRegistrationFields
                    name={name}
                    onNameChange={setName}
                    password={password}
                    onPasswordChange={setPassword}
                    passwordConfirmation={passwordConfirmation}
                    onPasswordConfirmationChange={setPasswordConfirmation}
                    errors={errors}
                />
            )}

            <Button type="submit" className="w-full" disabled={isAccepting}>
                {isAccepting
                    ? 'Confirmando…'
                    : invitation.requires_registration
                      ? 'Crear cuenta y unirme'
                      : 'Aceptar invitación'}
            </Button>
        </form>
    );
}
