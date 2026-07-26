import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { InsuranceProvider, PatientPayload, Sex } from '@/types/patient';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
    { value: 'f', label: 'Femenino' },
    { value: 'm', label: 'Masculino' },
    { value: 'u', label: 'Sin especificar' },
];

type PatientDetailFieldsProps = {
    values: PatientPayload;
    onChange: <K extends keyof PatientPayload>(
        field: K,
        value: PatientPayload[K],
    ) => void;
    insuranceProviders: InsuranceProvider[];
    errors: Record<string, string>;
};

export function PatientDetailFields({
    values,
    onChange,
    insuranceProviders,
    errors,
}: PatientDetailFieldsProps) {
    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="sex">Sexo</Label>
                    <Select
                        value={values.sex}
                        onValueChange={(value) => onChange('sex', value as Sex)}
                    >
                        <SelectTrigger id="sex" className="w-full">
                            <SelectValue placeholder="Seleccioná" />
                        </SelectTrigger>
                        <SelectContent>
                            {SEX_OPTIONS.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.sex && (
                        <p className="text-sm text-destructive">{errors.sex}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                    <Input
                        id="birth_date"
                        type="date"
                        value={values.birth_date}
                        onChange={(event) =>
                            onChange('birth_date', event.target.value)
                        }
                    />
                    {errors.birth_date && (
                        <p className="text-sm text-destructive">
                            {errors.birth_date}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="insurance_provider_id">Obra social</Label>
                <Select
                    value={
                        values.insurance_provider_id
                            ? String(values.insurance_provider_id)
                            : ''
                    }
                    onValueChange={(value) =>
                        onChange(
                            'insurance_provider_id',
                            value ? Number(value) : null,
                        )
                    }
                >
                    <SelectTrigger
                        id="insurance_provider_id"
                        className="w-full"
                    >
                        <SelectValue placeholder="Sin obra social" />
                    </SelectTrigger>
                    <SelectContent>
                        {insuranceProviders.map((provider) => (
                            <SelectItem
                                key={provider.id}
                                value={String(provider.id)}
                            >
                                {provider.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.insurance_provider_id && (
                    <p className="text-sm text-destructive">
                        {errors.insurance_provider_id}
                    </p>
                )}
            </div>
        </>
    );
}
