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
import { api } from '@/lib/api';
import type { Paginated } from '@/types/pagination';
import type { Patient } from '@/types/patient';
import type { Professional, ProfessionalService } from '@/types/professional';
import { useQuery } from '@tanstack/react-query';
import { useCreateAppointment } from '../-hooks/use-appointments';
import { useAvailabilityWarning } from '../-hooks/use-availability-warning';
import { applyAppointmentServerErrors } from './apply-appointment-server-errors';
import {
    appointmentSchema,
    type AppointmentFormValues,
} from './appointment-schemas';
import { AppointmentFormFields } from './AppointmentFormFields';
import { AvailabilityWarningDialog } from './AvailabilityWarningDialog';

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
    const [patientQuery, setPatientQuery] = useState('');
    const [showWarning, setShowWarning] = useState(false);
    const [appliedKey, setAppliedKey] = useState<string | null>(null);

    const openKey = open ? JSON.stringify(prefill ?? {}) : null;

    // Adjust state during render (not an Effect) to reset on each (re)open.
    if (open && openKey !== appliedKey) {
        setAppliedKey(openKey);
        setPatientQuery('');
        setShowWarning(false);
    }

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

    const { data: services } = useQuery({
        queryKey: ['professional-services', membershipId],
        queryFn: () =>
            api
                .get<{ data: ProfessionalService[] }>(
                    `/memberships/${membershipId}/services`,
                )
                .then((response) => response.data.data),
        enabled: membershipId !== null,
    });

    const { data: patientsPage } = useQuery({
        queryKey: ['patients', 'booking', patientQuery],
        queryFn: () =>
            api
                .get<Paginated<Patient>>('/patients', {
                    params: { q: patientQuery || undefined, page: 1 },
                })
                .then((response) => response.data),
        enabled: open,
    });

    const { isOutside, isLoading: isAvailabilityLoading } =
        useAvailabilityWarning(membershipId);
    const { mutateAsync, isPending } = useCreateAppointment();

    async function submit(values: AppointmentFormValues) {
        try {
            await mutateAsync({
                membershipId: values.membershipId as number,
                patientId: values.patientId as number,
                serviceId: values.serviceId as number,
                startAt: `${values.date}T${values.time}`,
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

        if (isOutside(new Date(`${values.date}T${values.time}`))) {
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
                                services={services ?? []}
                                patients={patientsPage?.data ?? []}
                                patientQuery={patientQuery}
                                onPatientQueryChange={setPatientQuery}
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
