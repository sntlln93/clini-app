import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { ExistingPatientNotice } from '@/features/patient-form/ExistingPatientNotice';
import { PatientFormFields } from '@/features/patient-form/PatientFormFields';
import { insuranceProvidersQueryOptions } from '@/features/patient-form/use-insurance-providers';
import { usePatientForm } from '@/features/patient-form/use-patient-form';
import type { Patient } from '@/types/patient';
import { patientPrefillFromSearch } from './patient-prefill';

type PatientCreateDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The search that found nobody; seeds the name or the document number. */
    search: string | null;
    onCreated: (patient: Patient) => void;
};

// Registers a patient without leaving the appointment dialog, so what was
// already typed there survives and the new patient comes back selected (#266).
export function PatientCreateDialog({
    open,
    onOpenChange,
    search,
    onCreated,
}: PatientCreateDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90svh] overflow-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Nuevo paciente</DialogTitle>
                    <DialogDescription>
                        Al guardarlo, queda elegido para este turno.
                    </DialogDescription>
                </DialogHeader>

                {/* Mounted per open (the popup unmounts when closed), so each one starts from the current search. */}
                <PatientCreateForm
                    search={search}
                    onCreated={(patient) => {
                        onCreated(patient);
                        onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

type PatientCreateFormProps = {
    search: string | null;
    onCreated: (patient: Patient) => void;
    onCancel: () => void;
};

function PatientCreateForm({
    search,
    onCreated,
    onCancel,
}: PatientCreateFormProps) {
    // Interaction-triggered read (ADR 0007's exception): only fetched once the dialog opens.
    const { data: insuranceProviders = [] } = useQuery(
        insuranceProvidersQueryOptions(),
    );
    const { form, foundPatient, submit } = usePatientForm({
        initialValues: patientPrefillFromSearch(search),
        onSaved: onCreated,
    });

    return (
        <Form {...form}>
            <form onSubmit={submit} className="space-y-4">
                {form.formState.errors.root && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </p>
                )}

                <ExistingPatientNotice patient={foundPatient} />

                <PatientFormFields
                    control={form.control}
                    insuranceProviders={insuranceProviders}
                />

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting
                            ? 'Guardando…'
                            : 'Guardar paciente'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
