import { useMemo } from 'react';
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
import type { Professional, ProfessionalService } from '@/types/professional';
import type { AppointmentFormValues } from './appointment-schemas';

type AppointmentProfessionalFieldsProps = {
    control: Control<AppointmentFormValues>;
    professionals: Professional[];
    services: ProfessionalService[];
};

export function AppointmentProfessionalFields({
    control,
    professionals,
    services,
}: AppointmentProfessionalFieldsProps) {
    const professionalItems = useMemo(
        () =>
            professionals.map((professional) => ({
                value: String(professional.id),
                label: professional.user.name ?? professional.user.email,
            })),
        [professionals],
    );

    const serviceItems = useMemo(
        () =>
            services.map((service) => ({
                value: String(service.service_id),
                label:
                    service.service_name ?? `Servicio #${service.service_id}`,
            })),
        [services],
    );

    return (
        <>
            <FormField
                control={control}
                name="membershipId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Profesional</FormLabel>
                        <Select
                            items={professionalItems}
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
                                {professionalItems.map((item) => (
                                    <SelectItem
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {item.label}
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
                            items={serviceItems}
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
                                {serviceItems.map((item) => (
                                    <SelectItem
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {item.label}
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
