import type { Control, FieldPath, FieldValues } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { MembershipRole } from '@/types/membership';
import { ROLE_OPTIONS, STATUS_OPTIONS } from './member-schemas';

type MemberFieldProps<TFieldValues extends FieldValues> = {
    control: Control<TFieldValues>;
    name: FieldPath<TFieldValues>;
};

// `roles` is multi-selection, so it stays a Checkbox group despite the <5-options RadioGroup rule (that rule applies only to single-choice fields).
export function MemberRoleFields<TFieldValues extends FieldValues>({
    control,
    name,
}: MemberFieldProps<TFieldValues>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => {
                const selected = (field.value ?? []) as MembershipRole[];

                return (
                    <FormItem>
                        <FormLabel>Roles</FormLabel>
                        <FormControl render={<div className="space-y-1.5" />}>
                            {ROLE_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        checked={selected.includes(
                                            option.value,
                                        )}
                                        onCheckedChange={(checked) =>
                                            field.onChange(
                                                checked === true
                                                    ? [
                                                          ...selected,
                                                          option.value,
                                                      ]
                                                    : selected.filter(
                                                          (role) =>
                                                              role !==
                                                              option.value,
                                                      ),
                                            )
                                        }
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                );
            }}
        />
    );
}

// `Estado` is single-choice with 3 options, so it follows the <5-options RadioGroup rule.
export function MemberStatusField<TFieldValues extends FieldValues>({
    control,
    name,
}: MemberFieldProps<TFieldValues>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl
                        render={
                            <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="flex flex-col gap-2"
                            />
                        }
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <label
                                key={option.value}
                                className="flex items-center gap-2 text-sm"
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
    );
}
