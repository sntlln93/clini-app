import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sessionHasPermission, useSession } from '@/lib/session';
import type { Appointment } from '@/types/appointment';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import {
    ALLOWED_TRANSITIONS,
    CANCELLABLE_STATUSES,
    RESCHEDULABLE_STATUSES,
} from './appointment-status';
import {
    AppointmentCardContent,
    type AppointmentCardVariant,
} from './AppointmentCardContent';
import {
    AppointmentStatusActions,
    NoShowConfirmDialog,
} from './AppointmentStatusActions';
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
    /** Week view only, when several professionals share a day column. */
    professionalLabel?: string;
};

type CardDialog =
    'reschedule' | 'cancel' | 'notes' | 'prescriptions' | 'noShow';

export function AppointmentCard({
    appointment,
    canUpdate,
    variant = 'default',
    compact = false,
    professionalLabel,
}: AppointmentCardProps) {
    const [openDialog, setOpenDialog] = useState<CardDialog | null>(null);
    const { data: session } = useSession();
    const router = useRouter();
    const nextStatuses = ALLOWED_TRANSITIONS[appointment.status];
    const canCancel = CANCELLABLE_STATUSES.includes(appointment.status);
    const canReschedule = RESCHEDULABLE_STATUSES.includes(appointment.status);
    // Clinical notes and prescriptions are authored-only (issues #30, #31): visible only to the professional booked on this appointment, independent of `canUpdate`.
    const isOwnAppointment =
        session?.membership?.id === appointment.membership_id;
    const canViewPatient = sessionHasPermission(session, 'patients.view');

    const dialogProps = (dialog: CardDialog) => ({
        open: openDialog === dialog,
        onOpenChange: (open: boolean) => setOpenDialog(open ? dialog : null),
        appointment,
    });

    const content = (
        <AppointmentCardContent
            appointment={appointment}
            variant={variant}
            compact={compact}
            professionalLabel={professionalLabel}
        />
    );

    const hasUpdateActions =
        canUpdate && (nextStatuses.length > 0 || canCancel || canReschedule);
    const hasRecordActions = canViewPatient || isOwnAppointment;

    if (!hasUpdateActions && !hasRecordActions) {
        return content;
    }

    return (
        <>
            <DropdownMenu>
                {/* `pointer-events-auto` keeps the card clickable inside a dimmed, click-through wrapper (day view). */}
                <DropdownMenuTrigger className="pointer-events-auto block h-full w-full text-left">
                    {content}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {canUpdate && (
                        <AppointmentStatusActions
                            appointment={appointment}
                            statuses={nextStatuses}
                            onNoShowRequest={() => setOpenDialog('noShow')}
                        />
                    )}
                    {canUpdate &&
                        (canCancel || canReschedule) &&
                        nextStatuses.length > 0 && <DropdownMenuSeparator />}
                    {canUpdate && canReschedule && (
                        <DropdownMenuItem
                            onClick={() => setOpenDialog('reschedule')}
                        >
                            Reprogramar
                        </DropdownMenuItem>
                    )}
                    {canUpdate && canCancel && (
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setOpenDialog('cancel')}
                        >
                            Cancelar
                        </DropdownMenuItem>
                    )}
                    {hasRecordActions && hasUpdateActions && (
                        <DropdownMenuSeparator />
                    )}
                    {canViewPatient && (
                        <DropdownMenuItem
                            onClick={() =>
                                void router.navigate({
                                    to: '/pacientes/$id',
                                    params: { id: appointment.patient_id },
                                })
                            }
                        >
                            Ver ficha del paciente
                        </DropdownMenuItem>
                    )}
                    {isOwnAppointment && (
                        <DropdownMenuItem
                            onClick={() => setOpenDialog('notes')}
                        >
                            Notas clínicas
                        </DropdownMenuItem>
                    )}
                    {isOwnAppointment && (
                        <DropdownMenuItem
                            onClick={() => setOpenDialog('prescriptions')}
                        >
                            Recetas
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <NoShowConfirmDialog {...dialogProps('noShow')} />
            <RescheduleAppointmentDialog {...dialogProps('reschedule')} />
            <CancelAppointmentDialog {...dialogProps('cancel')} />
            <ClinicalNotesDialog {...dialogProps('notes')} />
            <PrescriptionsDialog {...dialogProps('prescriptions')} />
        </>
    );
}
