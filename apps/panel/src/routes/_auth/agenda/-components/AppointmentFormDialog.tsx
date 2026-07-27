import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import type { Paginated, Patient } from '@/types/patient';
import type { ProfessionalService } from '@/types/professional';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useCreateAppointment } from '../-hooks/use-appointments';
import { useAvailabilityWarning } from '../-hooks/use-availability-warning';
import {
    AppointmentFormFields,
    type AppointmentFormValues,
} from './AppointmentFormFields';
import { AvailabilityWarningDialog } from './AvailabilityWarningDialog';

export type AppointmentPrefill = {
    membershipId?: number;
    date?: string;
    time?: string;
};

type AppointmentFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    professionals: Membership[];
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

/**
 * Manual entry and quick-create-from-free-cell both funnel through this
 * dialog: `prefill` is empty for the former and carries the clicked cell's
 * professional/date/time for the latter — the resulting appointment is
 * identical either way (`origin: manual`, decided by the backend).
 */
export function AppointmentFormDialog({
    open,
    onOpenChange,
    professionals,
    prefill,
}: AppointmentFormDialogProps) {
    const [values, setValues] = useState<AppointmentFormValues>(EMPTY_VALUES);
    const [appliedKey, setAppliedKey] = useState<string | null>(null);
    const [patientQuery, setPatientQuery] = useState('');
    const [showWarning, setShowWarning] = useState(false);

    const openKey = open ? JSON.stringify(prefill ?? {}) : null;

    // Adjust state during render instead of an Effect: reset the form every
    // time the dialog (re)opens, applying the clicked cell's prefill, if any.
    if (open && openKey !== appliedKey) {
        setAppliedKey(openKey);
        setValues(valuesFromPrefill(prefill));
        setPatientQuery('');
        setShowWarning(false);
    }

    const { data: services } = useQuery({
        queryKey: ['professional-services', values.membershipId],
        queryFn: () =>
            api
                .get<{ data: ProfessionalService[] }>(
                    `/memberships/${values.membershipId}/services`,
                )
                .then((response) => response.data.data),
        enabled: values.membershipId !== null,
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

    const { isOutside } = useAvailabilityWarning(values.membershipId);
    const { mutate, isPending, message, errors } = useCreateAppointment();

    function setField<K extends keyof AppointmentFormValues>(
        field: K,
        value: AppointmentFormValues[K],
    ) {
        setValues((previous) => ({ ...previous, [field]: value }));
    }

    function submit() {
        if (
            values.membershipId === null ||
            values.serviceId === null ||
            values.patientId === null ||
            !values.date ||
            !values.time
        ) {
            return;
        }

        mutate(
            {
                membershipId: values.membershipId,
                patientId: values.patientId,
                serviceId: values.serviceId,
                startAt: `${values.date}T${values.time}`,
                reason: values.reason || null,
                notes: null,
            },
            { onSuccess: () => onOpenChange(false) },
        );
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (
            values.date &&
            values.time &&
            isOutside(new Date(`${values.date}T${values.time}`))
        ) {
            setShowWarning(true);
            return;
        }

        submit();
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {message && (
                            <p className="text-sm text-destructive">
                                {message}
                            </p>
                        )}

                        <AppointmentFormFields
                            values={values}
                            onChange={setField}
                            professionals={professionals}
                            services={services ?? []}
                            patients={patientsPage?.data ?? []}
                            patientQuery={patientQuery}
                            onPatientQueryChange={setPatientQuery}
                            errors={errors}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Guardando…' : 'Crear turno'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AvailabilityWarningDialog
                open={showWarning}
                onOpenChange={setShowWarning}
                onConfirm={() => {
                    setShowWarning(false);
                    submit();
                }}
            />
        </>
    );
}
