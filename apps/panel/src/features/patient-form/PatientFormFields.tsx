import type { Control } from 'react-hook-form';

import type { InsuranceProvider, PatientPayload } from '@/types/patient';
import { PatientBasicFields } from './PatientBasicFields';
import { PatientContactsFields } from './PatientContactsFields';
import { PatientDetailFields } from './PatientDetailFields';

type PatientFormFieldsProps = {
    control: Control<PatientPayload>;
    insuranceProviders: InsuranceProvider[];
};

export function PatientFormFields({
    control,
    insuranceProviders,
}: PatientFormFieldsProps) {
    return (
        <div className="space-y-4">
            <PatientBasicFields control={control} />
            <PatientContactsFields control={control} />
            <PatientDetailFields
                control={control}
                insuranceProviders={insuranceProviders}
            />
        </div>
    );
}
