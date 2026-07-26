import type { InsuranceProvider, PatientPayload } from '@/types/patient';
import { PatientBasicFields } from './PatientBasicFields';
import { PatientDetailFields } from './PatientDetailFields';

type PatientFormFieldsProps = {
    values: PatientPayload;
    onChange: <K extends keyof PatientPayload>(
        field: K,
        value: PatientPayload[K],
    ) => void;
    insuranceProviders: InsuranceProvider[];
    errors: Record<string, string>;
};

export function PatientFormFields({
    values,
    onChange,
    insuranceProviders,
    errors,
}: PatientFormFieldsProps) {
    return (
        <div className="space-y-4">
            <PatientBasicFields
                values={values}
                onChange={onChange}
                errors={errors}
            />
            <PatientDetailFields
                values={values}
                onChange={onChange}
                insuranceProviders={insuranceProviders}
                errors={errors}
            />
        </div>
    );
}
