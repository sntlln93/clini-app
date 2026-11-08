import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { mapToAppError } from '@/lib/api-errors';
import { messageForAppError } from '@/lib/error-codes';
import { type FormEvent, useId, useState } from 'react';
import {
    type InvitationIdentity,
    useInvitationDocumentLookup,
} from '../-hooks/use-accept-invitation';

type InvitationDocumentStepProps = {
    token: string;
    lookupsLeft: number;
    /** Why the invitee is back at the DNI, if they were sent back. */
    notice?: string | null;
    onFound: (identity: InvitationIdentity) => void;
};

// Codes after which the invitation can't be accepted anymore: the practice has
// to invite again.
const CLOSING_CODES = new Set([
    'memberships.invitation_lookups_exhausted',
    'memberships.invitation_invalid_or_expired',
]);

function lookupsLeftCopy(left: number) {
    if (left === 0) {
        return 'Ya no te quedan consultas: solo podés volver a ingresar el DNI que encontramos.';
    }

    return left === 1 ? 'Te queda 1 consulta.' : `Te quedan ${left} consultas.`;
}

// The first step of a professional invitation (#417): the DNI, looked up in
// the registry, which gives the account its name. Three DNIs per invitation.
export function InvitationDocumentStep({
    token,
    lookupsLeft,
    notice = null,
    onFound,
}: InvitationDocumentStepProps) {
    const inputId = useId();
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const [value, setValue] = useState('');
    const { mutate, isPending, error } = useInvitationDocumentLookup(token);
    const appError = error ? mapToAppError(error) : null;
    const closed =
        appError?.kind === 'business' && CLOSING_CODES.has(appError.code);
    const left =
        appError?.kind === 'business' &&
        typeof appError.context.document_lookups_left === 'number'
            ? appError.context.document_lookups_left
            : lookupsLeft;
    const fieldError =
        appError?.kind === 'validation'
            ? appError.fields.document_number
            : undefined;
    const typed = value.replace(/[\s.]/g, '');

    function submit(event: FormEvent) {
        event.preventDefault();
        mutate(typed, { onSuccess: onFound });
    }

    if (closed) {
        return (
            <p
                role="alert"
                className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
                {messageForAppError(appError)}
            </p>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Para sumarte como profesional, ingresá tu DNI. Tu nombre y tus
                matrículas los buscamos en el Buscador Nacional de Profesionales
                de la Salud del Ministerio de Salud.
            </p>
            {notice && !appError && (
                <p
                    role="status"
                    className="rounded-md border bg-muted p-3 text-sm"
                >
                    {notice}
                </p>
            )}
            {appError && !fieldError && (
                <p
                    role="alert"
                    className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {messageForAppError(appError)}
                </p>
            )}
            <div className="space-y-1">
                <Label htmlFor={inputId}>DNI</Label>
                <Input
                    id={inputId}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={10}
                    placeholder="Sin puntos"
                    value={value}
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={
                        fieldError ? `${errorId} ${hintId}` : hintId
                    }
                    onChange={(event) => setValue(event.target.value)}
                />
                {fieldError && (
                    <p id={errorId} className="text-sm text-destructive">
                        {fieldError}
                    </p>
                )}
                <p id={hintId} className="text-sm text-muted-foreground">
                    {lookupsLeftCopy(left)}
                </p>
            </div>
            <Button
                type="submit"
                className="w-full"
                disabled={isPending || typed === ''}
            >
                {isPending && <Spinner data-icon="inline-start" />}
                {isPending ? 'Buscando…' : 'Buscar mis datos'}
            </Button>
        </form>
    );
}
