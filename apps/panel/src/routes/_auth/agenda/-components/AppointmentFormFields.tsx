import type { Control } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Patient } from '@/types/patient';
import type { Professional, ProfessionalService } from '@/types/professional';
import { AppointmentPatientField } from './AppointmentPatientField';
import { AppointmentProfessionalFields } from './AppointmentProfessionalFields';
import type { AppointmentFormValues } from './appointment-schemas';

type AppointmentFormFieldsProps = {
    control: Control<AppointmentFormValues>;
    professionals: Professional[];
    services: ProfessionalService[];
    patients: Patient[];
    patientQuery: string;
    onPatientQueryChange: (query: string) => void;
};

export function AppointmentFormFields({
    control,
    professionals,
    services,
    patients,
    patientQuery,
    onPatientQueryChange,
}: AppointmentFormFieldsProps) {
    return (
        <div className="space-y-4">
            <AppointmentProfessionalFields
                control={control}
                professionals={professionals}
                services={services}
            />

            <AppointmentPatientField
                control={control}
                patients={patients}
                patientQuery={patientQuery}
                onPatientQueryChange={onPatientQueryChange}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                    control={control}
                    name="date"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fecha</FormLabel>
                            <FormControl
                                render={<Input type="date" {...field} />}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="time"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hora</FormLabel>
                            <FormControl
                                render={<Input type="time" {...field} />}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                control={control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Motivo</FormLabel>
                        <FormControl render={<Input {...field} />} />
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}
