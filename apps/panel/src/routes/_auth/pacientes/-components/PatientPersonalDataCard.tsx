import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Patient } from '@/types/patient';
import { DOCUMENT_TYPE_OPTIONS, SEX_OPTIONS } from './patient-schemas';

type PatientPersonalDataCardProps = {
    patient: Patient;
};

function labelFor(
    options: { value: string; label: string }[],
    value: string,
): string {
    return options.find((option) => option.value === value)?.label ?? value;
}

function formatBirthDate(birthDate: string | null): string {
    if (birthDate === null) {
        return '—';
    }

    return new Date(`${birthDate}T00:00:00`).toLocaleDateString('es-AR');
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
        </div>
    );
}

export function PatientPersonalDataCard({
    patient,
}: PatientPersonalDataCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Datos personales</CardTitle>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Nombre" value={patient.name} />
                    <Field
                        label="Documento"
                        value={`${labelFor(DOCUMENT_TYPE_OPTIONS, patient.document_type)} ${patient.document_number}`}
                    />
                    <Field
                        label="Sexo"
                        value={
                            patient.sex
                                ? labelFor(SEX_OPTIONS, patient.sex)
                                : '—'
                        }
                    />
                    <Field
                        label="Fecha de nacimiento"
                        value={formatBirthDate(patient.birth_date)}
                    />
                </dl>
            </CardContent>
        </Card>
    );
}
