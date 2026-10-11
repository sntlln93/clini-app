import { Link, useNavigate } from '@tanstack/react-router';

import { Button, buttonVariants } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { ExistingPatientNotice } from '@/features/patient-form/ExistingPatientNotice';
import { PatientFormFields } from '@/features/patient-form/PatientFormFields';
import { usePatientForm } from '@/features/patient-form/use-patient-form';
import type { InsuranceProvider, Patient } from '@/types/patient';

type PatientFormProps = {
    patient?: Patient;
    insuranceProviders: InsuranceProvider[];
};

export function PatientForm({ patient, insuranceProviders }: PatientFormProps) {
    const navigate = useNavigate();
    const { form, foundPatient, submit } = usePatientForm({
        patient,
        onSaved: (saved) =>
            navigate({ to: '/pacientes/$id', params: { id: saved.id } }),
    });

    return (
        <Form {...form}>
            <form onSubmit={submit} className="max-w-xl space-y-4">
                {form.formState.errors.root && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </div>
                )}

                <ExistingPatientNotice patient={foundPatient} />

                <PatientFormFields
                    control={form.control}
                    insuranceProviders={insuranceProviders}
                />

                <div className="flex flex-wrap gap-2">
                    <Button
                        type="submit"
                        disabled={form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
                    </Button>
                    {patient ? (
                        <Link
                            to="/pacientes/$id"
                            params={{ id: patient.id }}
                            className={buttonVariants({ variant: 'outline' })}
                        >
                            Cancelar
                        </Link>
                    ) : (
                        <Link
                            to="/pacientes"
                            className={buttonVariants({ variant: 'outline' })}
                        >
                            Cancelar
                        </Link>
                    )}
                </div>
            </form>
        </Form>
    );
}
