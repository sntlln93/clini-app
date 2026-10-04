import { useMemo } from 'react';
import type { Control } from 'react-hook-form';

import { buttonVariants } from '@/components/ui/button';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Patient } from '@/types/patient';
import type { AppointmentFormValues } from './appointment-schemas';

type AppointmentPatientFieldProps = {
    control: Control<AppointmentFormValues>;
    patients: Patient[];
    patientQuery: string;
    onPatientQueryChange: (query: string) => void;
    /** The settled search that came back empty, or `null` while there are results (or nothing was searched). */
    emptySearch: string | null;
    canCreatePatient: boolean;
};

export function AppointmentPatientField({
    control,
    patients,
    patientQuery,
    onPatientQueryChange,
    emptySearch,
    canCreatePatient,
}: AppointmentPatientFieldProps) {
    const patientItems = useMemo(
        () =>
            patients.map((patient) => ({
                value: String(patient.id),
                label: `${patient.name} — ${patient.document_number}`,
            })),
        [patients],
    );

    return (
        <FormField
            control={control}
            name="patientId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Paciente</FormLabel>
                    {/* `FormLabel` names the Select below, so the search box needs its own accessible name. */}
                    <Input
                        aria-label="Buscar paciente"
                        placeholder="Buscar por nombre o documento…"
                        value={patientQuery}
                        onChange={(event) =>
                            onPatientQueryChange(event.target.value)
                        }
                    />
                    {emptySearch !== null && (
                        <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
                            No encontramos pacientes con “{emptySearch}”.
                            {canCreatePatient && (
                                // A new tab keeps what was already typed into this dialog.
                                <a
                                    href="/pacientes/nuevo"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={buttonVariants({
                                        variant: 'link',
                                        size: 'sm',
                                        className: 'h-auto px-0',
                                    })}
                                >
                                    Registrar paciente nuevo
                                </a>
                            )}
                        </p>
                    )}
                    <Select
                        items={patientItems}
                        value={field.value !== null ? String(field.value) : ''}
                        onValueChange={(value) => {
                            if (value === '') {
                                return;
                            }
                            field.onChange(Number(value));
                        }}
                    >
                        <FormControl
                            render={<SelectTrigger className="w-full" />}
                        >
                            <SelectValue placeholder="Seleccioná un paciente" />
                        </FormControl>
                        <SelectContent>
                            {patientItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
