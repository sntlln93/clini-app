import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BookingProfessional, BookingSpecialty } from '@/types/booking';
import { useId, useMemo } from 'react';

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

/**
 * Specialty → professional → service cascade. Not a form: every choice is
 * request state that lives in the URL (owned by the parent route), so
 * changing one select resets the ones downstream of it instead of leaving a
 * stale, no-longer-valid selection in place.
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

    const specialtyItems = specialties.map((specialty) => ({
        value: String(specialty.id),
        label: specialty.name,
    }));
    const professionalItems = filteredProfessionals.map((professional) => ({
        value: String(professional.membership_id),
        label:
            professional.name ?? `Profesional #${professional.membership_id}`,
    }));
    const serviceItems = services.map((service) => ({
        value: String(service.id),
        label: service.name ?? `Prestación #${service.id}`,
    }));

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h1 className="text-xl font-semibold">Reservar turno</h1>
                <p className="text-sm text-muted-foreground">
                    Elegí especialidad, profesional y prestación.
                </p>
            </div>

            {specialties.length > 0 && (
                <div className="space-y-1.5">
                    <Label htmlFor={specialtyTriggerId}>Especialidad</Label>
                    <Select
                        items={specialtyItems}
                        value={
                            selection.specialty
                                ? String(selection.specialty)
                                : undefined
                        }
                        onValueChange={(value) =>
                            onChange({
                                specialty: Number(value),
                                professional: undefined,
                                service: undefined,
                            })
                        }
                    >
                        <SelectTrigger
                            id={specialtyTriggerId}
                            className="w-full"
                        >
                            <SelectValue placeholder="Todas las especialidades" />
                        </SelectTrigger>
                        <SelectContent>
                            {specialtyItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-1.5">
                <Label htmlFor={professionalTriggerId}>Profesional</Label>
                <Select
                    items={professionalItems}
                    value={
                        selection.professional
                            ? String(selection.professional)
                            : undefined
                    }
                    onValueChange={(value) =>
                        onChange({
                            ...selection,
                            professional: Number(value),
                            service: undefined,
                        })
                    }
                >
                    <SelectTrigger
                        id={professionalTriggerId}
                        className="w-full"
                    >
                        <SelectValue placeholder="Seleccioná un profesional" />
                    </SelectTrigger>
                    <SelectContent>
                        {professionalItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedProfessional && (
                <div className="space-y-1.5">
                    <Label htmlFor={serviceTriggerId}>Prestación</Label>
                    <Select
                        items={serviceItems}
                        value={
                            selection.service
                                ? String(selection.service)
                                : undefined
                        }
                        onValueChange={(value) =>
                            onChange({ ...selection, service: Number(value) })
                        }
                    >
                        <SelectTrigger id={serviceTriggerId} className="w-full">
                            <SelectValue placeholder="Seleccioná una prestación" />
                        </SelectTrigger>
                        <SelectContent>
                            {serviceItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
}
