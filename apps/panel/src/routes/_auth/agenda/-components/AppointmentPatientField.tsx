import type { Control } from 'react-hook-form';

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
};

export function AppointmentPatientField({
    control,
    patients,
    patientQuery,
    onPatientQueryChange,
}: AppointmentPatientFieldProps) {
    return (
        <FormField
            control={control}
            name="patientId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Paciente</FormLabel>
                    <Input
                        placeholder="Buscar por nombre o documento…"
                        value={patientQuery}
                        onChange={(event) =>
                            onPatientQueryChange(event.target.value)
                        }
                    />
                    <Select
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
                            {patients.map((patient) => (
                                <SelectItem
                                    key={patient.id}
                                    value={String(patient.id)}
                                >
                                    {patient.name} — {patient.document_number}
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
