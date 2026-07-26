import { QueryErrorState } from '@/components/QueryErrorState';
import { Button } from '@/components/ui/button';
import type { Patient, PatientPayload } from '@/types/patient';
import { useState, type FormEvent } from 'react';
import { useInsuranceProviders } from '../-hooks/use-insurance-providers';
import { usePatientLookup } from '../-hooks/use-patient-lookup';
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

// Fills only fields the user hasn't already typed — mirrors the backend's
// find-or-create rule of never overwriting existing/entered data.
function withPrefill(values: PatientPayload, found: Patient): PatientPayload {
    return {
        ...values,
        name: values.name || found.name,
        email: values.email || found.email || '',
        phone: values.phone || found.phone || '',
        sex: values.sex || found.sex || '',
        birth_date: values.birth_date || found.birth_date || '',
        insurance_provider_id:
            values.insurance_provider_id ?? found.insurance_provider_id,
    };
}

export function PatientForm({ patient }: PatientFormProps) {
    const [values, setValues] = useState<PatientPayload>(() =>
        initialValues(patient),
    );
    const {
        data: insuranceProviders,
        isError: isInsuranceProvidersError,
        error: insuranceProvidersError,
    } = useInsuranceProviders();
    const { mutate, isPending, message, errors } = useSavePatient(patient?.id);
    // Create mode only: an edit form must never fight the user editing
    // their own patient's document, so lookup stays disabled there.
    const { data: foundPatient } = usePatientLookup(
        patient ? '' : values.document_type,
        patient ? '' : values.document_number,
    );

    // Adjust state during render (React's documented alternative to an
    // Effect for this exact case) instead of calling setState from inside
    // useEffect, which would trigger an extra cascading render.
    const [appliedLookupId, setAppliedLookupId] = useState<number | null>(null);
    if (foundPatient && foundPatient.id !== appliedLookupId) {
        setAppliedLookupId(foundPatient.id);
        setValues((previous) => withPrefill(previous, foundPatient));
    }

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

            {foundPatient && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                    Ya existe un paciente con este documento: se va a reutilizar
                    el registro y solo se completarán los datos faltantes.
                </div>
            )}

            {isInsuranceProvidersError && (
                <QueryErrorState error={insuranceProvidersError} />
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
