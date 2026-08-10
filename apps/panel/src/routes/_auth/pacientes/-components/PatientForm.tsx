import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type {
    InsuranceProvider,
    Patient,
    PatientPayload,
} from '@/types/patient';
import { usePatientLookup } from '../-hooks/use-patient-lookup';
import { useSavePatient } from '../-hooks/use-save-patient';
import { PatientFormFields } from './PatientFormFields';
import { patientSchema } from './patient-schemas';

type PatientFormProps = {
    patient?: Patient;
    insuranceProviders: InsuranceProvider[];
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

// `keepDirtyValues` leaves fields the user already typed untouched while filling in the rest.
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

export function PatientForm({ patient, insuranceProviders }: PatientFormProps) {
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
    // Create mode only: an edit form must not fight a user editing their own patient's document.
    const { data: foundPatient } = usePatientLookup(
        patient ? '' : documentType,
        patient ? '' : documentNumber,
    );

    // Not the "adjust state during render" prefill case: `form.reset()` notifies
    // Controller-subscribed children synchronously, so calling it in the render body would update other components' state mid-render.
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
            const fields = Object.keys(values) as (keyof PatientPayload)[];
            const fieldMap = Object.fromEntries(
                fields.map((field) => [field, field] as const),
            );

            applyFormErrors(form, extractFormErrors(error), fieldMap);
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

                <PatientFormFields
                    control={form.control}
                    insuranceProviders={insuranceProviders}
                />

                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </form>
        </Form>
    );
}
