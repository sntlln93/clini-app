import { TriangleAlert } from 'lucide-react';
import { useId, type ReactNode } from 'react';
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

type OptionRowProps = {
    descriptionId: string;
    description: string;
    children: ReactNode;
};

// The description sits outside the <label> and is linked via `aria-describedby`, so the control's accessible name stays the option label alone.
function OptionRow({ descriptionId, description, children }: OptionRowProps) {
    return (
        <div className="space-y-0.5">
            <label className="flex items-center gap-2 text-sm">
                {children}
            </label>
            <p
                id={descriptionId}
                className="pl-6 text-xs text-muted-foreground"
            >
                {description}
            </p>
        </div>
    );
}

// `roles` is multi-selection, so it stays a Checkbox group despite the <5-options RadioGroup rule (that rule applies only to single-choice fields).
export function MemberRoleFields<TFieldValues extends FieldValues>({
    control,
    name,
    warnOnOwner = false,
}: MemberFieldProps<TFieldValues> & { warnOnOwner?: boolean }) {
    const idPrefix = useId();

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => {
                const selected = (field.value ?? []) as MembershipRole[];

                function toggle(role: MembershipRole, checked: boolean) {
                    field.onChange(
                        checked
                            ? [...selected, role]
                            : selected.filter((value) => value !== role),
                    );
                }

                return (
                    <FormItem>
                        <FormLabel>Roles</FormLabel>
                        <FormControl render={<div className="space-y-2" />}>
                            {ROLE_OPTIONS.map((option) => (
                                <OptionRow
                                    key={option.value}
                                    descriptionId={`${idPrefix}-${option.value}`}
                                    description={option.description}
                                >
                                    <Checkbox
                                        aria-describedby={`${idPrefix}-${option.value}`}
                                        checked={selected.includes(
                                            option.value,
                                        )}
                                        onCheckedChange={(checked) =>
                                            toggle(
                                                option.value,
                                                checked === true,
                                            )
                                        }
                                    />
                                    {option.label}
                                </OptionRow>
                            ))}
                        </FormControl>
                        {warnOnOwner && selected.includes('owner') && (
                            <p className="flex items-start gap-2 text-sm text-muted-foreground">
                                <TriangleAlert
                                    className="mt-0.5 size-4 shrink-0"
                                    aria-hidden
                                />
                                Como Propietario va a tener control total del
                                consultorio, incluida la suscripción.
                            </p>
                        )}
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
    const idPrefix = useId();

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
                            <OptionRow
                                key={option.value}
                                descriptionId={`${idPrefix}-${option.value}`}
                                description={option.description}
                            >
                                <RadioGroupItem
                                    value={option.value}
                                    aria-describedby={`${idPrefix}-${option.value}`}
                                />
                                {option.label}
                            </OptionRow>
                        ))}
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
