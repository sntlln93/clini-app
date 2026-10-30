import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { patientQueryOptions } from '@/hooks/use-patient';
import { extractFormErrors } from '@/lib/form-errors';
import type { Appointment } from '@/types/appointment';
import { useResendAccessCode } from '../-hooks/use-resend-access-code';
import { describeAppointment } from './appointment-format';

type ResendAccessCodeDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment;
};

// The reception resends the patient's code when the patient asks for it
// (#364): only to a confirmed email, the ones that get the reminder. The
// patient's contacts are read on opening, an interaction (ADR 0007).
export function ResendAccessCodeDialog({
    open,
    onOpenChange,
    appointment,
}: ResendAccessCodeDialogProps) {
    const patient = useQuery({
        ...patientQueryOptions(appointment.patient_id),
        enabled: open,
    });
    const resend = useResendAccessCode(appointment.id);
    const [chosen, setChosen] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const emails = (patient.data?.contacts ?? []).filter(
        (contact) => contact.type === 'email' && !contact.needs_confirmation,
    );
    const contactId = chosen || (emails[0] ? String(emails[0].id) : '');

    async function send() {
        setError(null);

        try {
            await resend.mutateAsync(Number(contactId));
            onOpenChange(false);
        } catch (failure) {
            setError(extractFormErrors(failure).message);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reenviar código al paciente</DialogTitle>
                    <DialogDescription>
                        {`${describeAppointment(appointment)}. `}
                        Es el código que el paciente comparte para que quien lo
                        atiende vea lo que registraron otros profesionales. Le
                        llega por email; vos no lo ves.
                    </DialogDescription>
                </DialogHeader>

                {patient.isPending ? (
                    <p className="text-sm text-muted-foreground">
                        Cargando los emails del paciente…
                    </p>
                ) : emails.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        El paciente no tiene un email confirmado. Agregalo en su
                        ficha para enviarle el código.
                    </p>
                ) : (
                    <RadioGroup
                        aria-label="Email del paciente"
                        value={contactId}
                        onValueChange={(value) => setChosen(String(value))}
                        className="flex flex-col gap-4"
                    >
                        {emails.map((email) => (
                            <label
                                key={email.id}
                                className="flex items-center gap-2 text-sm"
                            >
                                <RadioGroupItem value={String(email.id)} />
                                {email.display}
                            </label>
                        ))}
                    </RadioGroup>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Volver
                    </Button>
                    <Button
                        type="button"
                        disabled={contactId === '' || resend.isPending}
                        onClick={() => void send()}
                    >
                        Enviar código
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
