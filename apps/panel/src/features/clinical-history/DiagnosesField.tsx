import type { Control, FieldPathByValue, FieldValues } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { MAX_DIAGNOSES } from '@/lib/clinical-note-schema';
import type { ClinicalNoteDiagnosis } from '@/types/clinical-note';
import { DiagnosisCombobox } from './DiagnosisCombobox';

type DiagnosesFieldProps<T extends FieldValues> = {
    control: Control<T>;
    name: FieldPathByValue<T, ClinicalNoteDiagnosis[]>;
};

// The note's optional ICD-10 diagnoses (#324), next to its free text: the
// selected ones in order, each removable, and a search to add more.
export function DiagnosesField<T extends FieldValues>({
    control,
    name,
}: DiagnosesFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => {
                const diagnoses: ClinicalNoteDiagnosis[] = field.value;
                const full = diagnoses.length >= MAX_DIAGNOSES;

                return (
                    <FormItem>
                        <FormLabel>Diagnósticos CIE-10 (opcional)</FormLabel>
                        {diagnoses.length > 0 && (
                            <ol className="space-y-1 text-sm">
                                {diagnoses.map((diagnosis) => (
                                    <li
                                        key={diagnosis.icd10_code_id}
                                        className="flex items-center gap-2"
                                    >
                                        <span className="shrink-0 font-mono text-xs font-medium">
                                            {diagnosis.code}
                                        </span>
                                        <span className="min-w-0 flex-1 wrap-break-word">
                                            {diagnosis.description}
                                        </span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            aria-label={`Quitar ${diagnosis.code}`}
                                            onClick={() =>
                                                field.onChange(
                                                    diagnoses.filter(
                                                        (other) =>
                                                            other !== diagnosis,
                                                    ),
                                                )
                                            }
                                        >
                                            Quitar
                                        </Button>
                                    </li>
                                ))}
                            </ol>
                        )}
                        <DiagnosisCombobox
                            selected={diagnoses}
                            onChange={field.onChange}
                            disabled={full}
                        />
                        {full && (
                            <FormDescription>
                                Una nota admite hasta {MAX_DIAGNOSES}{' '}
                                diagnósticos.
                            </FormDescription>
                        )}
                        <FormMessage />
                    </FormItem>
                );
            }}
        />
    );
}
