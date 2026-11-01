import { useWatch, type UseFormReturn } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { ExceptionFormValues } from './exception-form';
import { ExceptionTypeField } from './ExceptionTypeField';
import { ExceptionWhenFields } from './ExceptionWhenFields';

const REASON_PLACEHOLDERS: Record<ExceptionFormValues['type'], string> = {
    blocked: 'Vacaciones, congreso…',
    extra: 'Atención un sábado…',
};

type AvailabilityExceptionFieldsProps = {
    form: UseFormReturn<ExceptionFormValues>;
    canManageOrgWide: boolean;
    /** An existing exception keeps its scope: the API doesn't move it between a professional and the practice. */
    isEditing: boolean;
};

export function AvailabilityExceptionFields({
    form,
    canManageOrgWide,
    isEditing,
}: AvailabilityExceptionFieldsProps) {
    const [type, isOrgWide] = useWatch({
        control: form.control,
        name: ['type', 'isOrgWide'],
    });

    return (
        <div className="space-y-4">
            <ExceptionTypeField
                control={form.control}
                extraDisabled={isOrgWide}
            />

            <ExceptionWhenFields form={form} />

            <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            Motivo{' '}
                            <span className="font-normal text-muted-foreground">
                                (opcional)
                            </span>
                        </FormLabel>
                        <FormControl
                            render={
                                <Input
                                    placeholder={REASON_PLACEHOLDERS[type]}
                                    {...field}
                                />
                            }
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />

            {type === 'blocked' && canManageOrgWide && (
                <FormField
                    control={form.control}
                    name="isOrgWide"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2">
                            <FormControl
                                render={
                                    <Checkbox
                                        checked={field.value}
                                        disabled={isEditing}
                                        onCheckedChange={(checked) =>
                                            field.onChange(checked === true)
                                        }
                                    />
                                }
                            />
                            <FormLabel className="font-normal">
                                Todo el consultorio (feriado o cierre)
                            </FormLabel>
                        </FormItem>
                    )}
                />
            )}
        </div>
    );
}
