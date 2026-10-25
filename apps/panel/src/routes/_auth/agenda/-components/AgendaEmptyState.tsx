import { Button } from '@/components/ui/button';
import { EmptyState } from '@/features/empty-state/EmptyState';
import { bookingUrl, copyBookingLink } from '@/lib/booking-link';
import type { DateTime } from '@/lib/datetime';
import { useWritesRestriction } from '@/lib/plan';
import { useSession } from '@/lib/session';
import { CalendarCheck, Link2, Plus } from 'lucide-react';
import {
    agendaEmptyDescription,
    agendaEmptyTitle,
    agendaRangeTense,
} from './agenda-empty';
import type { AgendaViewMode } from './AgendaToolbar';

type AgendaEmptyStateProps = {
    date: DateTime;
    view: AgendaViewMode;
    canCreate: boolean;
    onNewAppointment: () => void;
    onToday: () => void;
};

/**
 * Stands in for the grid while the range has no appointment (#305). A range
 * still to come offers the practice's booking link and a manual appointment;
 * one already over only leads back to today. While writes are restricted it
 * only says why.
 */
export function AgendaEmptyState({
    date,
    view,
    canCreate,
    onNewAppointment,
    onToday,
}: AgendaEmptyStateProps) {
    const { data: session } = useSession();
    const restriction = useWritesRestriction();
    // A restricted practice's booking page takes no bookings, so there is no link to share.
    const slug = restriction ? null : session?.organization?.slug;
    const tense = agendaRangeTense(date, view);

    return (
        <EmptyState
            illustration={view === 'day' ? 'agenda_day' : 'agenda_week'}
            title={agendaEmptyTitle(date, view, tense)}
            description={agendaEmptyDescription(tense, canCreate, restriction)}
            framed={false}
            action={
                tense === 'past' ? (
                    <Button onClick={onToday}>
                        <CalendarCheck data-icon="inline-start" />
                        Ir a hoy
                    </Button>
                ) : (
                    <>
                        {slug && (
                            <Button
                                onClick={() =>
                                    void copyBookingLink(bookingUrl(slug))
                                }
                            >
                                <Link2 data-icon="inline-start" />
                                Copiar link de reservas
                            </Button>
                        )}
                        {canCreate && !restriction && (
                            <Button
                                variant="outline"
                                onClick={onNewAppointment}
                            >
                                <Plus data-icon="inline-start" />
                                Agendar turno
                            </Button>
                        )}
                    </>
                )
            }
        />
    );
}
