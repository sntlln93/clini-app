import type { BookingProfessional, BookingSpecialty } from '@/types/booking';
import { useId, useMemo } from 'react';
import { BookingSelectField } from './BookingSelectField';
import { professionalLabel, serviceOptionLabel } from './booking-format';

type SelectionValues = {
    specialty?: number;
    professional?: number;
    service?: number;
};

type BookingSelectionStepProps = {
    professionals: BookingProfessional[];
    selection: SelectionValues;
    onChange: (next: SelectionValues) => void;
};

/** Non-empty sentinel for "no specialty filter": an empty string breaks the `items=` label lookup and base-ui's value handling. */
const ALL_SPECIALTIES = 'all';

function uniqueSpecialties(
    professionals: BookingProfessional[],
): BookingSpecialty[] {
    const byId = new Map<number, BookingSpecialty>();
    for (const professional of professionals) {
        for (const specialty of professional.specialties) {
            byId.set(specialty.id, specialty);
        }
    }
    return [...byId.values()];
}

function EmptyMessage({ children }: { children: string }) {
    return <p className="text-sm text-muted-foreground">{children}</p>;
}

/**
 * Choosing one select resets the ones downstream, so no stale,
 * no-longer-valid selection survives.
 */
export function BookingSelectionStep({
    professionals,
    selection,
    onChange,
}: BookingSelectionStepProps) {
    const specialtyTriggerId = useId();
    const professionalTriggerId = useId();
    const serviceTriggerId = useId();
    const specialties = useMemo(
        () => uniqueSpecialties(professionals),
        [professionals],
    );

    // Never empty while a specialty is selected: specialties come from the professionals themselves.
    const filteredProfessionals = useMemo(
        () =>
            selection.specialty
                ? professionals.filter((professional) =>
                      professional.specialties.some(
                          (specialty) => specialty.id === selection.specialty,
                      ),
                  )
                : professionals,
        [professionals, selection.specialty],
    );

    const selectedProfessional = filteredProfessionals.find(
        (professional) => professional.membership_id === selection.professional,
    );
    const services = selectedProfessional?.services ?? [];

    const specialtyItems = [
        { value: ALL_SPECIALTIES, label: 'Todas las especialidades' },
        ...specialties.map((specialty) => ({
            value: String(specialty.id),
            label: specialty.name,
        })),
    ];
    const professionalItems = filteredProfessionals.map((professional) => ({
        value: String(professional.membership_id),
        label: professionalLabel(professional),
    }));
    const serviceItems = services.map((service) => ({
        value: String(service.id),
        label: serviceOptionLabel(service),
    }));

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h1 className="text-xl tracking-tight">Reservar turno</h1>
                <p className="text-sm text-muted-foreground">
                    Elegí especialidad, profesional y prestación.
                </p>
            </div>

            {professionals.length === 0 && (
                <EmptyMessage>
                    Este consultorio todavía no tiene turnos disponibles online.
                </EmptyMessage>
            )}

            {specialties.length > 0 && (
                <BookingSelectField
                    id={specialtyTriggerId}
                    label="Especialidad"
                    items={specialtyItems}
                    value={
                        selection.specialty
                            ? String(selection.specialty)
                            : ALL_SPECIALTIES
                    }
                    placeholder="Todas las especialidades"
                    onValueChange={(value) =>
                        onChange({
                            specialty:
                                value === ALL_SPECIALTIES || value === null
                                    ? undefined
                                    : Number(value),
                            professional: undefined,
                            service: undefined,
                        })
                    }
                />
            )}

            {professionals.length > 0 && (
                <BookingSelectField
                    id={professionalTriggerId}
                    label="Profesional"
                    items={professionalItems}
                    value={
                        selection.professional
                            ? String(selection.professional)
                            : null
                    }
                    placeholder="Seleccioná un profesional"
                    onValueChange={(value) =>
                        onChange({
                            ...selection,
                            professional: Number(value),
                            service: undefined,
                        })
                    }
                />
            )}

            {selectedProfessional && services.length === 0 && (
                <EmptyMessage>
                    Este profesional no tiene prestaciones para reservar online.
                </EmptyMessage>
            )}

            {selectedProfessional && services.length > 0 && (
                <BookingSelectField
                    id={serviceTriggerId}
                    label="Prestación"
                    items={serviceItems}
                    value={selection.service ? String(selection.service) : null}
                    placeholder="Seleccioná una prestación"
                    onValueChange={(value) =>
                        onChange({ ...selection, service: Number(value) })
                    }
                />
            )}
        </div>
    );
}
