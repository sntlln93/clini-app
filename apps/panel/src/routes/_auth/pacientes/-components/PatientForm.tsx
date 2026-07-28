import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { QueryErrorState } from '@/components/QueryErrorState';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { extractFormErrors } from '@/lib/form-errors';
import type { Patient, PatientPayload } from '@/types/patient';
import { useInsuranceProviders } from '../-hooks/use-insurance-providers';
import { usePatientLookup } from '../-hooks/use-patient-lookup';
import { useSavePatient } from '../-hooks/use-save-patient';
import { PatientFormFields } from './PatientFormFields';
import { patientSchema } from './patient-schemas';

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

// Values sourced from an existing patient found by document lookup, merged
// into the form via `form.reset(..., { keepDirtyValues: true })` so fields
// the user already typed stay untouched while the rest gets filled in.
function valuesFromFoundPatient(found: Patient): PatientPayload {
    return {
        name: found.name,
        document_type: found.document_type,
        document_number: found.document_number,
        email: found.email ?? '',
        phone: found.phone ?? '',
        sex: found.sex ?? '',
        birth_date: found.birth_date ?? '',
        insurance_provider_id: found.insurance_provider_id,
    };
}

export function PatientForm({ patient }: PatientFormProps) {
    const {
        data: insuranceProviders,
        isError: isInsuranceProvidersError,
        error: insuranceProvidersError,
    } = useInsuranceProviders();
    const { mutateAsync } = useSavePatient(patient?.id);

    const form = useForm<PatientPayload>({
        resolver: zodResolver(patientSchema),
        defaultValues: initialValues(patient),
    });

    const documentType = useWatch({
        control: form.control,
        name: 'document_type',
    });
    const documentNumber = useWatch({
        control: form.control,
        name: 'document_number',
    });
    // Create mode only: an edit form must never fight the user editing
    // their own patient's document, so lookup stays disabled there.
    const { data: foundPatient } = usePatientLookup(
        patient ? '' : documentType,
        patient ? '' : documentNumber,
    );

    // Syncing an async query result into RHF's own (uncontrolled, ref-based)
    // form state is a documented `reset()`-in-an-effect case, not the
    // plain-state prefill the "adjust state during render" convention
    // targets: `form.reset()` notifies Controller-subscribed child
    // components synchronously, so calling it directly in this render body
    // (rather than in an effect) would update those components' state while
    // this component is still rendering.
    useEffect(() => {
        if (foundPatient) {
            form.reset(valuesFromFoundPatient(foundPatient), {
                keepDirtyValues: true,
            });
        }
    }, [foundPatient, form]);

    async function onSubmit(values: PatientPayload) {
        try {
            await mutateAsync(values);
        } catch (error) {
            const { message, errors } = extractFormErrors(error);

            for (const field of Object.keys(
                values,
            ) as (keyof PatientPayload)[]) {
                if (errors[field]) {
                    form.setError(field, { message: errors[field] });
                }
            }
            if (message) {
                form.setError('root', { message });
            }
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="max-w-xl space-y-4"
            >
                {form.formState.errors.root && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </div>
                )}

                {foundPatient && (
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                        Ya existe un paciente con este documento: se va a
                        reutilizar el registro y solo se completarán los datos
                        faltantes.
                    </div>
                )}

                {isInsuranceProvidersError && (
                    <QueryErrorState error={insuranceProvidersError} />
                )}

                <PatientFormFields
                    control={form.control}
                    insuranceProviders={insuranceProviders ?? []}
                />

                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </form>
        </Form>
    );
}
