import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Patient } from '@/types/patient';
import { mailtoHref, telHref } from './contact-links';

type PatientContactCardProps = {
    patient: Patient;
};

function Field({
    label,
    value,
    href,
}: {
    label: string;
    value: string | null;
    href: (value: string) => string;
}) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium wrap-break-word">
                {value ? (
                    <a
                        href={href(value)}
                        className="text-primary underline-offset-4 hover:underline"
                    >
                        {value}
                    </a>
                ) : (
                    '—'
                )}
            </dd>
        </div>
    );
}

export function PatientContactCard({ patient }: PatientContactCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Contacto</CardTitle>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                        label="Correo electrónico"
                        value={patient.email}
                        href={mailtoHref}
                    />
                    <Field
                        label="Teléfono"
                        value={patient.phone}
                        href={telHref}
                    />
                </dl>
            </CardContent>
        </Card>
    );
}
