import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Membership } from '@/types/membership';
import type { Patient } from '@/types/patient';
import type { ProfessionalService } from '@/types/professional';
import { AppointmentPatientField } from './AppointmentPatientField';
import { AppointmentProfessionalFields } from './AppointmentProfessionalFields';

export type AppointmentFormValues = {
    membershipId: number | null;
    serviceId: number | null;
    patientId: number | null;
    date: string;
    time: string;
    reason: string;
};

type AppointmentFormFieldsProps = {
    values: AppointmentFormValues;
    onChange: <K extends keyof AppointmentFormValues>(
        field: K,
        value: AppointmentFormValues[K],
    ) => void;
    professionals: Membership[];
    services: ProfessionalService[];
    patients: Patient[];
    patientQuery: string;
    onPatientQueryChange: (query: string) => void;
    errors: Record<string, string>;
};

export function AppointmentFormFields({
    values,
    onChange,
    professionals,
    services,
    patients,
    patientQuery,
    onPatientQueryChange,
    errors,
}: AppointmentFormFieldsProps) {
    return (
        <div className="space-y-4">
            <AppointmentProfessionalFields
                values={values}
                onChange={onChange}
                professionals={professionals}
                services={services}
                errors={errors}
            />

            <AppointmentPatientField
                patientId={values.patientId}
                onPatientIdChange={(patientId) =>
                    onChange('patientId', patientId)
                }
                patients={patients}
                patientQuery={patientQuery}
                onPatientQueryChange={onPatientQueryChange}
                error={errors.patient_id}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                        id="date"
                        type="date"
                        value={values.date}
                        onChange={(event) =>
                            onChange('date', event.target.value)
                        }
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Input
                        id="time"
                        type="time"
                        value={values.time}
                        onChange={(event) =>
                            onChange('time', event.target.value)
                        }
                        required
                    />
                </div>
                {errors.start_at && (
                    <p className="text-sm text-destructive sm:col-span-2">
                        {errors.start_at}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Input
                    id="reason"
                    value={values.reason}
                    onChange={(event) => onChange('reason', event.target.value)}
                />
                {errors.reason && (
                    <p className="text-sm text-destructive">{errors.reason}</p>
                )}
            </div>
        </div>
    );
}
