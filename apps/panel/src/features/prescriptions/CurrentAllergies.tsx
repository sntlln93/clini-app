import { mapToAppError } from '@/lib/api-errors';
import { CLINICAL_ACCESS_EXPIRED } from '@/lib/clinical-access';
import { extractFormErrors } from '@/lib/form-errors';
import { entryDetails } from '@/lib/medical-history';
import { useCurrentAllergies } from './use-current-allergies';

function errorMessage(error: unknown): string {
    const appError = mapToAppError(error);

    if (
        appError.kind === 'business' &&
        appError.code === CLINICAL_ACCESS_EXPIRED
    ) {
        return 'Sin un turno con este paciente cerca de hoy, sus alergias se ven al abrir su historia clínica con un acceso excepcional, desde su ficha. Al indicar, Clini igual te avisa si la medicación coincide con alguna.';
    }

    return (
        extractFormErrors(error).message ??
        'No se pudieron cargar las alergias del paciente.'
    );
}

// The patient's current allergies the professional reads, above the form that
// indicates medication (#362). Another author's, without the patient's code,
// stay out: the warning on saving still covers them.
export function CurrentAllergies({
    appointmentId,
}: {
    appointmentId: number | null;
}) {
    const query = useCurrentAllergies(appointmentId);

    if (appointmentId === null) {
        return null;
    }

    return (
        <section aria-labelledby="current-allergies" className="space-y-1">
            <h3 id="current-allergies" className="text-sm font-medium">
                Alergias vigentes
            </h3>
            {query.isPending && (
                <p className="text-sm text-muted-foreground">
                    Cargando alergias…
                </p>
            )}
            {query.isError && (
                <p className="text-sm text-muted-foreground">
                    {errorMessage(query.error)}
                </p>
            )}
            {!query.isError && query.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No hay alergias vigentes registradas que puedas ver.
                </p>
            )}
            {!query.isError && query.data && query.data.length > 0 && (
                <ul className="space-y-1 text-sm">
                    {query.data.map((allergy) => (
                        <li key={allergy.id} className="wrap-break-word">
                            <span className="font-medium">
                                {allergy.description}
                            </span>
                            {entryDetails(allergy) && (
                                <span className="text-muted-foreground">
                                    {` · ${entryDetails(allergy)}`}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
