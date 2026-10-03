import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from '@/lib/session';
import type { Appointment } from '@/types/appointment';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { useUpdateAppointmentStatus } from '../-hooks/use-appointments';
import {
    ALLOWED_TRANSITIONS,
    CANCELLABLE_STATUSES,
    RESCHEDULABLE_STATUSES,
    STATUS_LABELS,
} from './appointment-status';
import {
    AppointmentCardContent,
    type AppointmentCardVariant,
} from './AppointmentCardContent';
import { CancelAppointmentDialog } from './CancelAppointmentDialog';
import { ClinicalNotesDialog } from './ClinicalNotesDialog';
import { PrescriptionsDialog } from './PrescriptionsDialog';
import { RescheduleAppointmentDialog } from './RescheduleAppointmentDialog';

type AppointmentCardProps = {
    appointment: Appointment;
    canUpdate: boolean;
    /** @default 'default' — reproduces the original render used by the week view. */
    variant?: AppointmentCardVariant;
    /** Day view only: hides the service line when the block is too short for three lines. */
    compact?: boolean;
};

export function AppointmentCard({
    appointment,
    canUpdate,
    variant = 'default',
    compact = false,
}: AppointmentCardProps) {
    const [showReschedule, setShowReschedule] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showPrescriptions, setShowPrescriptions] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();
    const { mutate } = useUpdateAppointmentStatus();
    const nextStatuses = ALLOWED_TRANSITIONS[appointment.status];
    const canCancel = CANCELLABLE_STATUSES.includes(appointment.status);
    const canReschedule = RESCHEDULABLE_STATUSES.includes(appointment.status);
    // Clinical notes and prescriptions are authored-only (issues #30, #31): visible only to the professional booked on this appointment, independent of `canUpdate`.
    const isOwnAppointment =
        session?.membership?.id === appointment.membership_id;

    function goToPatient() {
        void router.navigate({
            to: '/pacientes/$id',
            params: { id: appointment.patient_id },
        });
    }

    const content = (
        <AppointmentCardContent
            appointment={appointment}
            variant={variant}
            compact={compact}
        />
    );

    const hasUpdateActions =
        canUpdate && (nextStatuses.length > 0 || canCancel || canReschedule);
    const hasActions = hasUpdateActions || isOwnAppointment;

    if (!hasActions) {
        return content;
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger className="block h-full w-full text-left">
                    {content}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {nextStatuses.map((status) => (
                        <DropdownMenuItem
                            key={status}
                            onClick={() =>
                                mutate({
                                    appointmentId: appointment.id,
                                    status,
                                })
                            }
                        >
                            {STATUS_LABELS[status]}
                        </DropdownMenuItem>
                    ))}
                    {(canCancel || canReschedule) &&
                        nextStatuses.length > 0 && <DropdownMenuSeparator />}
                    {canReschedule && (
                        <DropdownMenuItem
                            onClick={() => setShowReschedule(true)}
                        >
                            Reprogramar
                        </DropdownMenuItem>
                    )}
                    {canCancel && (
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setShowCancel(true)}
                        >
                            Cancelar
                        </DropdownMenuItem>
                    )}
                    {isOwnAppointment && hasUpdateActions && (
                        <DropdownMenuSeparator />
                    )}
                    {isOwnAppointment && (
                        <DropdownMenuItem onClick={goToPatient}>
                            Ver ficha del paciente
                        </DropdownMenuItem>
                    )}
                    {isOwnAppointment && (
                        <DropdownMenuItem onClick={() => setShowNotes(true)}>
                            Notas clínicas
                        </DropdownMenuItem>
                    )}
                    {isOwnAppointment && (
                        <DropdownMenuItem
                            onClick={() => setShowPrescriptions(true)}
                        >
                            Recetas
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <RescheduleAppointmentDialog
                open={showReschedule}
                onOpenChange={setShowReschedule}
                appointment={appointment}
            />

            <CancelAppointmentDialog
                open={showCancel}
                onOpenChange={setShowCancel}
                appointment={appointment}
            />

            <ClinicalNotesDialog
                open={showNotes}
                onOpenChange={setShowNotes}
                appointment={appointment}
            />

            <PrescriptionsDialog
                open={showPrescriptions}
                onOpenChange={setShowPrescriptions}
                appointment={appointment}
            />
        </>
    );
}
