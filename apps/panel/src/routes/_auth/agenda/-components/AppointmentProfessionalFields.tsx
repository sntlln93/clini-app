import type { Control } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Membership } from '@/types/membership';
import type { ProfessionalService } from '@/types/professional';
import type { AppointmentFormValues } from './appointment-schemas';

type AppointmentProfessionalFieldsProps = {
    control: Control<AppointmentFormValues>;
    professionals: Membership[];
    services: ProfessionalService[];
};

export function AppointmentProfessionalFields({
    control,
    professionals,
    services,
}: AppointmentProfessionalFieldsProps) {
    return (
        <>
            <FormField
                control={control}
                name="membershipId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Profesional</FormLabel>
                        <Select
                            value={
                                field.value !== null ? String(field.value) : ''
                            }
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
                                <SelectValue placeholder="Seleccioná un profesional" />
                            </FormControl>
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
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="serviceId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Servicio</FormLabel>
                        <Select
                            value={
                                field.value !== null ? String(field.value) : ''
                            }
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
                                <SelectValue placeholder="Seleccioná un servicio" />
                            </FormControl>
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
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
}
