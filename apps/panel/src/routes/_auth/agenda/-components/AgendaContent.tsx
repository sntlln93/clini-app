import { Button } from '@/components/ui/button';
import { AppointmentStatusLegend } from '@/features/appointment-status/AppointmentStatusLegend';
import { EmptyState } from '@/features/empty-state/EmptyState';
import { NoProfessionalsEmptyState } from '@/features/NoProfessionalsEmptyState';
import type { DateTime } from '@/lib/datetime';
import type { Appointment } from '@/types/appointment';
import type { Professional } from '@/types/professional';
import { rangeFor } from './agenda-dates';
import { hasVisibleAppointments, newAppointmentDay } from './agenda-empty';
import { AgendaDayView } from './AgendaDayView';
import { AgendaEmptyState } from './AgendaEmptyState';
import type { AgendaViewMode } from './AgendaToolbar';
import { AgendaWeekView } from './AgendaWeekView';

type AgendaContentProps = {
    date: DateTime;
    view: AgendaViewMode;
    professionals: Professional[];
    visibleProfessionals: Professional[];
    appointments: Appointment[];
    /** The setup checklist is on screen, and already explains an empty agenda. */
    showSetup: boolean;
    noneVisibleFromFilter: boolean;
    canCreate: (membership: Professional) => boolean;
    canUpdate: (membership: Professional) => boolean;
    onCellClick: (membershipId: number, hour: number) => void;
    onDayClick: (day: DateTime) => void;
    onToday: () => void;
    onShowAllProfessionals: () => void;
};

/** What the agenda card shows under its toolbar: the grid and its legend, or why there is nothing to show yet. */
export function AgendaContent({
    date,
    view,
    professionals,
    visibleProfessionals,
    appointments,
    showSetup,
    noneVisibleFromFilter,
    canCreate,
    canUpdate,
    onCellClick,
    onDayClick,
    onToday,
    onShowAllProfessionals,
}: AgendaContentProps) {
    if (professionals.length === 0) {
        return showSetup ? null : (
            <NoProfessionalsEmptyState
                description="Invitá a un profesional para empezar a cargar turnos."
                framed={false}
            />
        );
    }

    if (noneVisibleFromFilter) {
        return (
            <EmptyState
                illustration="search"
                title="No elegiste ningún profesional"
                description="Elegí en el filtro de quién querés ver los turnos."
                framed={false}
                action={
                    <Button variant="outline" onClick={onShowAllProfessionals}>
                        Mostrar todos
                    </Button>
                }
            />
        );
    }

    if (
        !showSetup &&
        !hasVisibleAppointments(appointments, visibleProfessionals)
    ) {
        return (
            <AgendaEmptyState
                date={date}
                view={view}
                canCreate={visibleProfessionals.some(canCreate)}
                onNewAppointment={() =>
                    onDayClick(newAppointmentDay(date, view))
                }
                onToday={onToday}
            />
        );
    }

    return (
        <>
            {view === 'day' ? (
                <AgendaDayView
                    date={date}
                    professionals={visibleProfessionals}
                    appointments={appointments}
                    canUpdate={canUpdate}
                    canCreate={canCreate}
                    onCellClick={onCellClick}
                />
            ) : (
                <AgendaWeekView
                    weekStart={rangeFor(date, view).start}
                    professionals={visibleProfessionals}
                    appointments={appointments}
                    canUpdate={canUpdate}
                    canCreate={canCreate}
                    onDayClick={onDayClick}
                />
            )}
            <AppointmentStatusLegend className="px-5 pt-3 pb-5" />
        </>
    );
}
