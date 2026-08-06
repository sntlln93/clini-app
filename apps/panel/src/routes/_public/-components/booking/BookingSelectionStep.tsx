import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BookingProfessional, BookingSpecialty } from '@/types/booking';
import type { ComponentProps } from 'react';
import { useId, useMemo } from 'react';

type SelectionValues = {
    specialty?: number;
    professional?: number;
    service?: number;
};

type SelectableItem = { value: string; label: string };

function selectValueLabel(
    items: SelectableItem[],
    value: string | null,
    placeholder: string,
): string {
    if (!value) {
        return placeholder;
    }
    return items.find((item) => item.value === value)?.label ?? placeholder;
}

/**
 * `SelectTrigger` forces `*:data-[slot=select-value]:flex` on its
 * `SelectValue` child, and `text-overflow: ellipsis` never takes effect on
 * an element whose own computed `display` is `flex`. Rendering the label
 * inside a nested `<span>` sidesteps that: as the sole child of a flex
 * container, the span is blockified by the CSS Display spec regardless of
 * its own `display` value, so `truncate` (overflow/ellipsis/nowrap) applies
 * to it correctly. See issue #154 — the primitive itself is out of scope
 * (tracked as its own follow-up), this only fixes the three booking call
 * sites.
 */
function TruncatedSelectValue({
    items,
    placeholder,
}: {
    items: SelectableItem[];
    placeholder: string;
}) {
    return (
        <SelectValue placeholder={placeholder} className="min-w-0">
            {(value: string | null) => (
                <span className="block w-full min-w-0 truncate">
                    {selectValueLabel(items, value, placeholder)}
                </span>
            )}
        </SelectValue>
    );
}

type BookingSelectFieldProps = {
    id: string;
    label: string;
    items: SelectableItem[];
    value?: string;
    placeholder: string;
    onValueChange: NonNullable<ComponentProps<typeof Select>['onValueChange']>;
};

function BookingSelectField({
    id,
    label,
    items,
    value,
    placeholder,
    onValueChange,
}: BookingSelectFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Select items={items} value={value} onValueChange={onValueChange}>
                <SelectTrigger id={id} className="w-full">
                    <TruncatedSelectValue
                        items={items}
                        placeholder={placeholder}
                    />
                </SelectTrigger>
                <SelectContent>
                    {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

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
                <BookingSelectField
                    id={specialtyTriggerId}
                    label="Especialidad"
                    items={specialtyItems}
                    value={
                        selection.specialty
                            ? String(selection.specialty)
                            : undefined
                    }
                    placeholder="Todas las especialidades"
                    onValueChange={(value) =>
                        onChange({
                            specialty: Number(value),
                            professional: undefined,
                            service: undefined,
                        })
                    }
                />
            )}

            <BookingSelectField
                id={professionalTriggerId}
                label="Profesional"
                items={professionalItems}
                value={
                    selection.professional
                        ? String(selection.professional)
                        : undefined
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

            {selectedProfessional && (
                <BookingSelectField
                    id={serviceTriggerId}
                    label="Prestación"
                    items={serviceItems}
                    value={
                        selection.service
                            ? String(selection.service)
                            : undefined
                    }
                    placeholder="Seleccioná una prestación"
                    onValueChange={(value) =>
                        onChange({ ...selection, service: Number(value) })
                    }
                />
            )}
        </div>
    );
}
