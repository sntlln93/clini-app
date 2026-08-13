import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Patient } from '@/types/patient';

type PatientContactCardProps = {
    patient: Patient;
};

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
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
                        value={patient.email ?? '—'}
                    />
                    <Field label="Teléfono" value={patient.phone ?? '—'} />
                </dl>
            </CardContent>
        </Card>
    );
}
