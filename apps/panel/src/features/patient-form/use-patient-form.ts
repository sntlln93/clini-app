import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';

import type { ErrorCode } from '@/lib/error-codes';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import {
    contactDrafts,
    contactErrorFieldMap,
    contactsPayload,
    emptyContactDraft,
    sameContact,
} from '@/lib/patient-contacts';
import type { Patient, PatientPayload } from '@/types/patient';
import { patientSchema } from './patient-schemas';
import { usePatientLookup } from './use-patient-lookup';
import { useSavePatient } from './use-save-patient';

type UsePatientFormOptions = {
    /** Edit mode when given; create mode (with the lookup by document) otherwise. */
    patient?: Patient;
    /** Create mode only: values to start from instead of a blank form. */
    initialValues?: Partial<PatientPayload>;
    onSaved: (saved: Patient) => unknown;
};

function startingValues(
    patient: Patient | undefined,
    initialValues: Partial<PatientPayload> | undefined,
): PatientPayload {
    return {
        name: patient?.name ?? '',
        document_type: patient?.document_type ?? 'dni',
        document_number: patient?.document_number ?? '',
        contacts: patient
            ? contactDrafts(patient.contacts)
            : [emptyContactDraft('phone'), emptyContactDraft('email')],
        sex: patient?.sex ?? '',
        birth_date: patient?.birth_date ?? '',
        insurance_provider_id: patient?.insurance_provider_id ?? null,
        insurance_member_number: patient?.insurance_member_number ?? '',
        ...(patient ? {} : initialValues),
    };
}

// `keepDirtyValues` leaves fields the user already typed untouched while filling in the rest.
// Contacts are a list, not fields: the found patient's go first, then any the
// user already typed that they don't have, since saving only adds to them. One
// an online booking left unconfirmed isn't offered: registering the patient
// doesn't confirm it, only their edit form does (#365).
function valuesFromFoundPatient(
    found: Patient,
    typed: PatientPayload['contacts'],
): PatientPayload {
    const drafts = contactDrafts(
        found.contacts.filter((contact) => !contact.needs_confirmation),
    );
    const extra = contactsPayload(typed).contacts.filter(
        (contact) =>
            !found.contacts.some((saved) => sameContact(saved, contact)),
    );

    return {
        name: found.name,
        document_type: found.document_type,
        document_number: found.document_number,
        contacts: [...drafts, ...extra],
        sex: found.sex ?? '',
        birth_date: found.birth_date ?? '',
        insurance_provider_id: found.insurance_provider_id,
        insurance_member_number: found.insurance_member_number ?? '',
    };
}

/** The patient form's state, lookup and submit, shared by the patients pages and the agenda's dialog. */
// A concurrent registration can still take the number after validation passed (#290).
const SAVE_PATIENT_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'patients.insurance_member_number_taken': 'insurance_member_number',
};

export function usePatientForm({
    patient,
    initialValues,
    onSaved,
}: UsePatientFormOptions) {
    const { mutateAsync } = useSavePatient(patient?.id);

    const form = useForm<PatientPayload>({
        resolver: zodResolver(patientSchema),
        defaultValues: startingValues(patient, initialValues),
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
            const values = valuesFromFoundPatient(
                foundPatient,
                form.getValues('contacts'),
            );

            form.reset(values, { keepDirtyValues: true });
            form.setValue('contacts', values.contacts);
        }
    }, [foundPatient, form]);

    async function onSubmit(values: PatientPayload) {
        const { contacts, formIndex } = contactsPayload(values.contacts);
        let saved: Patient;

        try {
            saved = await mutateAsync({ ...values, contacts });
        } catch (error) {
            const fields = Object.keys(values) as (keyof PatientPayload)[];
            const fieldMap = {
                ...Object.fromEntries(
                    fields.map((field) => [field, field] as const),
                ),
                ...contactErrorFieldMap('contacts', formIndex),
            } as Record<string, FieldPath<PatientPayload>>;

            applyFormErrors(
                form,
                extractFormErrors(error, SAVE_PATIENT_FIELD_MAP),
                fieldMap,
            );
            return;
        }

        // `saved.id` also covers a create that reused an existing patient by document.
        await onSaved(saved);
    }

    return { form, foundPatient, submit: form.handleSubmit(onSubmit) };
}
