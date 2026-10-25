import type { Control } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
    PRESCRIPTION_ANNULMENT_KIND_DESCRIPTIONS,
    PRESCRIPTION_ANNULMENT_KIND_LABELS,
    PRESCRIPTION_ANNULMENT_KINDS,
} from '@/lib/prescription-annulment';
import type {
    AnnulPrescriptionFormOutput,
    AnnulPrescriptionFormValues,
} from './annul-prescription-schema';

export function AnnulPrescriptionFields({
    control,
}: {
    control: Control<
        AnnulPrescriptionFormValues,
        unknown,
        AnnulPrescriptionFormOutput
    >;
}) {
    return (
        <>
            <FormField
                control={control}
                name="kind"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Por qué se anula</FormLabel>
                        <FormControl
                            render={
                                <RadioGroup
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    className="flex flex-col gap-3"
                                />
                            }
                        >
                            {PRESCRIPTION_ANNULMENT_KINDS.map((kind) => (
                                <label
                                    key={kind}
                                    className="flex items-start gap-2 text-sm"
                                >
                                    <RadioGroupItem
                                        value={kind}
                                        className="mt-0.5"
                                    />
                                    <span className="font-medium">
                                        {
                                            PRESCRIPTION_ANNULMENT_KIND_LABELS[
                                                kind
                                            ]
                                        }
                                        <span className="block font-normal text-muted-foreground">
                                            {
                                                PRESCRIPTION_ANNULMENT_KIND_DESCRIPTIONS[
                                                    kind
                                                ]
                                            }
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Motivo</FormLabel>
                        <FormControl
                            render={<Textarea maxLength={500} {...field} />}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
}
