import type { Control } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    TYPE_OPTIONS,
    type AvailabilityExceptionFormValues,
} from './availability-schemas';

type AvailabilityExceptionFieldsProps = {
    control: Control<AvailabilityExceptionFormValues>;
    canManageOrgWide: boolean;
};

export function AvailabilityExceptionFields({
    control,
    canManageOrgWide,
}: AvailabilityExceptionFieldsProps) {
    return (
        <>
            <div className="flex flex-wrap items-start gap-3">
                <FormField
                    control={control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                                Tipo
                            </FormLabel>
                            <FormControl
                                render={
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        className="flex gap-3"
                                    />
                                }
                            >
                                {TYPE_OPTIONS.map((option) => (
                                    <label
                                        key={option.value}
                                        className="flex items-center gap-1.5 text-sm"
                                    >
                                        <RadioGroupItem value={option.value} />
                                        {option.label}
                                    </label>
                                ))}
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="startAt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                                Desde
                            </FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        type="datetime-local"
                                        className="w-52"
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="endAt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                                Hasta
                            </FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        type="datetime-local"
                                        className="w-52"
                                        {...field}
                                    />
                                }
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
                        <FormLabel className="text-xs text-muted-foreground">
                            Motivo
                        </FormLabel>
                        <FormControl render={<Input {...field} />} />
                        <FormMessage />
                    </FormItem>
                )}
            />

            {canManageOrgWide && (
                <FormField
                    control={control}
                    name="isOrgWide"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2 space-y-0">
                            <FormControl
                                render={
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) =>
                                            field.onChange(checked === true)
                                        }
                                    />
                                }
                            />
                            <FormLabel className="text-sm">
                                Aplicar a toda la organización
                            </FormLabel>
                        </FormItem>
                    )}
                />
            )}
        </>
    );
}
