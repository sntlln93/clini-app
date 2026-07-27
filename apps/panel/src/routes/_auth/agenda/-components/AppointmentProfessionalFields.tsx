import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Membership } from '@/types/membership';
import type { ProfessionalService } from '@/types/professional';
import type { AppointmentFormValues } from './AppointmentFormFields';

type AppointmentProfessionalFieldsProps = {
    values: AppointmentFormValues;
    onChange: <K extends keyof AppointmentFormValues>(
        field: K,
        value: AppointmentFormValues[K],
    ) => void;
    professionals: Membership[];
    services: ProfessionalService[];
    errors: Record<string, string>;
};

export function AppointmentProfessionalFields({
    values,
    onChange,
    professionals,
    services,
    errors,
}: AppointmentProfessionalFieldsProps) {
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="membership_id">Profesional</Label>
                <Select
                    value={
                        values.membershipId !== null
                            ? String(values.membershipId)
                            : ''
                    }
                    onValueChange={(value) => {
                        if (value === '') {
                            return;
                        }
                        onChange('membershipId', Number(value));
                    }}
                >
                    <SelectTrigger id="membership_id" className="w-full">
                        <SelectValue placeholder="Seleccioná un profesional" />
                    </SelectTrigger>
                    <SelectContent>
                        {professionals.map((professional) => (
                            <SelectItem
                                key={professional.id}
                                value={String(professional.id)}
                            >
                                {professional.user.name ??
                                    professional.user.email}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.membership_id && (
                    <p className="text-sm text-destructive">
                        {errors.membership_id}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="service_id">Servicio</Label>
                <Select
                    value={
                        values.serviceId !== null
                            ? String(values.serviceId)
                            : ''
                    }
                    onValueChange={(value) => {
                        if (value === '') {
                            return;
                        }
                        onChange('serviceId', Number(value));
                    }}
                >
                    <SelectTrigger id="service_id" className="w-full">
                        <SelectValue placeholder="Seleccioná un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                        {services.map((service) => (
                            <SelectItem
                                key={service.id}
                                value={String(service.service_id)}
                            >
                                {service.service_name ??
                                    `Servicio #${service.service_id}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.service_id && (
                    <p className="text-sm text-destructive">
                        {errors.service_id}
                    </p>
                )}
            </div>
        </>
    );
}
