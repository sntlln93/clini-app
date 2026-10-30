import { StatusPill } from '@/components/StatusPill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { contactTypeLabel } from '@/lib/patient-contacts';
import type { Patient, PatientContact } from '@/types/patient';
import { contactHref } from './contact-links';

type PatientContactCardProps = {
    patient: Patient;
};

function ContactItem({ contact }: { contact: PatientContact }) {
    const external = contact.type === 'whatsapp';

    return (
        <li className="min-w-0">
            <p className="text-xs text-muted-foreground">
                {contactTypeLabel(contact.type)}
                {contact.label && ` · ${contact.label}`}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <a
                    href={contactHref(contact)}
                    className="min-w-0 wrap-break-word text-primary underline-offset-4 hover:underline"
                    {...(external
                        ? { target: '_blank', rel: 'noreferrer' }
                        : {})}
                >
                    {contact.display}
                </a>
                {contact.needs_confirmation && (
                    <StatusPill tone="warning">Sin confirmar</StatusPill>
                )}
            </p>
        </li>
    );
}

export function PatientContactCard({ patient }: PatientContactCardProps) {
    const unconfirmed = patient.contacts.some(
        (contact) => contact.needs_confirmation,
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {patient.contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Sin datos de contacto.
                    </p>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {patient.contacts.map((contact) => (
                            <ContactItem key={contact.id} contact={contact} />
                        ))}
                    </ul>
                )}
                {unconfirmed && (
                    <p className="text-sm text-muted-foreground">
                        Un contacto sin confirmar lo agregó una reserva online y
                        no recibe recordatorios hasta que alguien del
                        consultorio lo confirme editando al paciente.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
