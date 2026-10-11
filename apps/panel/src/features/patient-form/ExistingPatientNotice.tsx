import type { Patient } from '@/types/patient';
import { Link } from '@tanstack/react-router';

type ExistingPatientNoticeProps = {
    patient: Patient | null | undefined;
};

// The live region always renders (empty until a match), so screen readers announce the match when it appears.
export function ExistingPatientNotice({ patient }: ExistingPatientNoticeProps) {
    return (
        <div role="status">
            {patient && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                    Ya existe un paciente con este documento: se va a reutilizar
                    el registro y solo se completarán los datos faltantes.{' '}
                    <Link
                        to="/pacientes/$id"
                        params={{ id: patient.id }}
                        className="font-medium text-primary underline underline-offset-4"
                    >
                        Ver ficha de {patient.name}
                    </Link>
                </div>
            )}
        </div>
    );
}
