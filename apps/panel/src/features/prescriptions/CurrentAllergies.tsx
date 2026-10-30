import type { ReactNode } from 'react';

import { extractFormErrors } from '@/lib/form-errors';
import { entryDetails } from '@/lib/medical-history';
import {
    useCurrentAllergies,
    type CurrentAllergies as CurrentAllergiesData,
} from './use-current-allergies';

function errorMessage(error: unknown): string {
    return (
        extractFormErrors(error).message ??
        'No se pudieron cargar las alergias del paciente.'
    );
}

function Note({ children }: { children: ReactNode }) {
    return <p className="text-sm text-muted-foreground">{children}</p>;
}

function AllergyList({ current }: { current: CurrentAllergiesData }) {
    if (current.reasonRequired) {
        return (
            <Note>
                Sin un turno con este paciente cerca de hoy, sus alergias se ven
                al abrir su historia clínica con un acceso excepcional, desde su
                ficha. Al indicar, Clini igual te avisa si la medicación
                coincide con alguna.
            </Note>
        );
    }

    if (current.allergies.length === 0) {
        return (
            <Note>No hay alergias vigentes registradas que puedas ver.</Note>
        );
    }

    return (
        <ul className="space-y-1 text-sm">
            {current.allergies.map((allergy) => (
                <li key={allergy.id} className="wrap-break-word">
                    <span className="font-medium">{allergy.description}</span>
                    {entryDetails(allergy) && (
                        <span className="text-muted-foreground">
                            {` · ${entryDetails(allergy)}`}
                        </span>
                    )}
                </li>
            ))}
        </ul>
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
            {query.isPending ? (
                <Note>Cargando alergias…</Note>
            ) : query.isError ? (
                <Note>{errorMessage(query.error)}</Note>
            ) : (
                <AllergyList current={query.data} />
            )}
        </section>
    );
}
