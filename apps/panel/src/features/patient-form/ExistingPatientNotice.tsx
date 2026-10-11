import type { Patient } from '@/types/patient';

type ExistingPatientNoticeProps = {
    patient: Patient | null | undefined;
};

// The live region always renders (empty until a match), so screen readers announce the match when it appears.
// No link to the patient's page: the lookup is global, so the match may not be linked to this organization
// yet and its page would answer 403 until the form is saved (#266).
export function ExistingPatientNotice({ patient }: ExistingPatientNoticeProps) {
    return (
        <div role="status">
            {patient && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                    Ya existe un paciente con este documento ({patient.name}):
                    se va a reutilizar el registro y solo se completarán los
                    datos faltantes.
                </div>
            )}
        </div>
    );
}
