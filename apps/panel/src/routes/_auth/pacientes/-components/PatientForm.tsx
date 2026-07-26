import { Button } from '@/components/ui/button';
import type { Patient, PatientPayload } from '@/types/patient';
import { useState, type FormEvent } from 'react';
import { useInsuranceProviders } from '../-hooks/use-insurance-providers';
import { useSavePatient } from '../-hooks/use-save-patient';
import { PatientFormFields } from './PatientFormFields';

type PatientFormProps = {
    patient?: Patient;
};

function initialValues(patient?: Patient): PatientPayload {
    return {
        name: patient?.name ?? '',
        document_type: patient?.document_type ?? '',
        document_number: patient?.document_number ?? '',
        email: patient?.email ?? '',
        phone: patient?.phone ?? '',
        sex: patient?.sex ?? '',
        birth_date: patient?.birth_date ?? '',
        insurance_provider_id: patient?.insurance_provider_id ?? null,
    };
}

export function PatientForm({ patient }: PatientFormProps) {
    const [values, setValues] = useState<PatientPayload>(() =>
        initialValues(patient),
    );
    const { data: insuranceProviders } = useInsuranceProviders();
    const { mutate, isPending, message, errors } = useSavePatient(patient?.id);

    function setField<K extends keyof PatientPayload>(
        field: K,
        value: PatientPayload[K],
    ) {
        setValues((previous) => ({ ...previous, [field]: value }));
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        mutate(values);
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
            {message && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {message}
                </div>
            )}

            <PatientFormFields
                values={values}
                onChange={setField}
                insuranceProviders={insuranceProviders ?? []}
                errors={errors}
            />

            <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
        </form>
    );
}
