import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

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
import { fromDateAndTime, toInstant } from '@/lib/datetime';
import { sessionHasPermission, useSession } from '@/lib/session';
import type { Professional } from '@/types/professional';
import { useCreateAppointment } from '../-hooks/use-appointments';
import { useAvailabilityWarning } from '../-hooks/use-availability-warning';
import { useBookableServices } from '../-hooks/use-bookable-services';
import { usePatientSearch } from '../-hooks/use-patient-search';
import { useResetOnOpen } from '../-hooks/use-reset-on-open';
import { applyAppointmentServerErrors } from './apply-appointment-server-errors';
import {
    appointmentSchema,
    type AppointmentFormValues,
} from './appointment-schemas';
import { AppointmentFormFields } from './AppointmentFormFields';
import { AvailabilityWarningDialog } from './AvailabilityWarningDialog';
import { PatientCreateDialog } from './PatientCreateDialog';

export type AppointmentPrefill = {
    membershipId?: number;
    date?: string;
    time?: string;
};

type AppointmentFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    professionals: Professional[];
    prefill?: AppointmentPrefill;
};

const EMPTY_VALUES: AppointmentFormValues = {
    membershipId: null,
    serviceId: null,
    patientId: null,
    date: '',
    time: '',
    reason: '',
};

function valuesFromPrefill(
    prefill: AppointmentPrefill | undefined,
): AppointmentFormValues {
    return {
        ...EMPTY_VALUES,
        membershipId: prefill?.membershipId ?? null,
        date: prefill?.date ?? '',
        time: prefill?.time ?? '',
    };
}

// Manual entry and quick-create-from-free-cell both funnel through this dialog; the result is identical either way (`origin: manual`).
export function AppointmentFormDialog({
    open,
    onOpenChange,
    professionals,
    prefill,
}: AppointmentFormDialogProps) {
    const {
        patientQuery,
        setPatientQuery,
        patients,
        emptySearch,
        resetSearch,
        pinPatient,
    } = usePatientSearch(open);
    const { data: session } = useSession();
    const [showWarning, setShowWarning] = useState(false);
    const [creatingPatient, setCreatingPatient] = useState(false);

    useResetOnOpen(open, JSON.stringify(prefill ?? {}), () => {
        resetSearch();
        setShowWarning(false);
        setCreatingPatient(false);
    });

    const form = useForm<AppointmentFormValues>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: EMPTY_VALUES,
    });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (open) {
            form.reset(valuesFromPrefill(prefill));
        }
    }, [open, prefill, form]);

    const membershipId = useWatch({
        control: form.control,
        name: 'membershipId',
    });

    const services = useBookableServices(membershipId);

    const { isOutside, isLoading: isAvailabilityLoading } =
        useAvailabilityWarning(membershipId);
    const { mutateAsync, isPending } = useCreateAppointment();

    async function submit(values: AppointmentFormValues) {
        try {
            await mutateAsync({
                membershipId: values.membershipId as number,
                patientId: values.patientId as number,
                serviceId: values.serviceId as number,
                startAt: toInstant(fromDateAndTime(values.date, values.time)),
                reason: values.reason || null,
                notes: null,
            });
            onOpenChange(false);
        } catch (error) {
            applyAppointmentServerErrors(form, error);
        }
    }

    function onValid(values: AppointmentFormValues) {
        // Wait for availability queries to settle; partial data would silently report "available".
        if (isAvailabilityLoading) {
            return;
        }

        if (isOutside(fromDateAndTime(values.date, values.time))) {
            setShowWarning(true);
            return;
        }

        void submit(values);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo turno</DialogTitle>
                        <DialogDescription>
                            Registrá un turno manual para un profesional.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onValid)}
                            className="space-y-4"
                        >
                            {form.formState.errors.root && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.root.message}
                                </p>
                            )}

                            <AppointmentFormFields
                                control={form.control}
                                professionals={professionals}
                                services={services}
                                patients={patients}
                                patientQuery={patientQuery}
                                onPatientQueryChange={setPatientQuery}
                                emptyPatientSearch={emptySearch}
                                onCreatePatient={
                                    sessionHasPermission(
                                        session,
                                        'patients.create',
                                    )
                                        ? () => setCreatingPatient(true)
                                        : undefined
                                }
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        isPending ||
                                        form.formState.isSubmitting ||
                                        isAvailabilityLoading
                                    }
                                >
                                    {isPending ? 'Guardando…' : 'Crear turno'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>

                    {/* Nested inside this popup (outside its <form>, so its own submit doesn't bubble into this one). */}
                    <PatientCreateDialog
                        open={creatingPatient}
                        onOpenChange={setCreatingPatient}
                        search={emptySearch}
                        onCreated={(patient) => {
                            pinPatient(patient);
                            form.setValue('patientId', patient.id, {
                                shouldValidate: true,
                            });
                        }}
                    />
                </DialogContent>
            </Dialog>

            <AvailabilityWarningDialog
                open={showWarning}
                onOpenChange={setShowWarning}
                onConfirm={() => {
                    setShowWarning(false);
                    void submit(form.getValues());
                }}
            />
        </>
    );
}
