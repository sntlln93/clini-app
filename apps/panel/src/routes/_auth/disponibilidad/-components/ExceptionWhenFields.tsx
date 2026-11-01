import { TimeInput } from '@/components/TimeInput';
import { Checkbox } from '@/components/ui/checkbox';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import type { ExceptionFormValues } from './exception-form';

type InputName = 'startDate' | 'endDate' | 'startTime' | 'endTime';

function DateTimeField({
    form,
    name,
    label,
    type,
    onValue,
}: {
    form: UseFormReturn<ExceptionFormValues>;
    name: InputName;
    label: string;
    type: 'date' | 'time';
    onValue?: (value: string) => void;
}) {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem className="min-w-0">
                    <FormLabel>{label}</FormLabel>
                    <FormControl
                        render={
                            type === 'time' ? (
                                <TimeInput
                                    {...field}
                                    onChange={(value) => {
                                        field.onChange(value);
                                        onValue?.(value);
                                    }}
                                />
                            ) : (
                                <Input
                                    type="date"
                                    {...field}
                                    onChange={(event) => {
                                        field.onChange(event);
                                        onValue?.(event.target.value);
                                    }}
                                />
                            )
                        }
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

/**
 * When the exception applies. «Sin atención» spans whole days by default, or
 * from an hour on its first day to an hour on its last; «Horas adicionales»
 * is one range of hours on a single date.
 */
export function ExceptionWhenFields({
    form,
}: {
    form: UseFormReturn<ExceptionFormValues>;
}) {
    const [type, allDay] = useWatch({
        control: form.control,
        name: ['type', 'allDay'],
    });

    // «Hasta» follows «Desde» until it is set to a later day.
    function followStartDate(startDate: string) {
        const endDate = form.getValues('endDate');
        if (endDate === '' || endDate < startDate) {
            form.setValue('endDate', startDate);
        }
    }

    if (type === 'extra') {
        return (
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                <div className="min-[360px]:col-span-2">
                    <DateTimeField
                        form={form}
                        name="startDate"
                        label="Fecha"
                        type="date"
                    />
                </div>
                <DateTimeField
                    form={form}
                    name="startTime"
                    label="Desde"
                    type="time"
                />
                <DateTimeField
                    form={form}
                    name="endTime"
                    label="Hasta"
                    type="time"
                />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                <DateTimeField
                    form={form}
                    name="startDate"
                    label="Desde"
                    type="date"
                    onValue={followStartDate}
                />
                <DateTimeField
                    form={form}
                    name="endDate"
                    label="Hasta"
                    type="date"
                />
            </div>
            <FormField
                control={form.control}
                name="allDay"
                render={({ field }) => (
                    <FormItem>
                        {/* The checkbox sits inside its label, so a tap on
                            the text toggles it and its hit area stays its own. */}
                        <FormLabel className="flex w-fit items-center gap-2 font-normal">
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
                            Todo el día
                        </FormLabel>
                    </FormItem>
                )}
            />
            {!allDay && (
                <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                    <DateTimeField
                        form={form}
                        name="startTime"
                        label="Desde la hora"
                        type="time"
                    />
                    <DateTimeField
                        form={form}
                        name="endTime"
                        label="Hasta la hora"
                        type="time"
                    />
                </div>
            )}
        </div>
    );
}
