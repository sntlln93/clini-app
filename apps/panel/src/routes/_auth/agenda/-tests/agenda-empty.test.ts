import { DateTime } from '@/lib/datetime';
import type { Appointment } from '@/types/appointment';
import { describe, expect, it } from 'vitest';
import {
    agendaEmptyDescription,
    agendaEmptyTitle,
    agendaRangeTense,
    hasVisibleAppointments,
    newAppointmentDay,
} from '../-components/agenda-empty';

// Wednesday, 5 August 2026, mid-morning; its week runs Sunday 2 to Saturday 8.
const NOW = DateTime.local(2026, 8, 5, 10, 30);

function appointmentOf(membershipId: number): Appointment {
    return {
        id: 1,
        membership_id: membershipId,
        patient_id: 50,
        service_id: 100,
        status: 'scheduled',
        origin: 'manual',
        start_at: '2026-08-05T10:00:00',
        end_at: '2026-08-05T10:30:00',
        reason: null,
        notes: null,
        cancelled_at: null,
        cancellation_reason: null,
        rescheduled_from_id: null,
        reported_insurance_provider_id: null,
        reported_insurance_member_number: null,
        arrived_at: null,
    };
}

describe('hasVisibleAppointments', () => {
    it('counts only the appointments of the professionals on screen', () => {
        const appointments = [appointmentOf(2)];

        expect(hasVisibleAppointments(appointments, [{ id: 2 }])).toBe(true);
        expect(hasVisibleAppointments(appointments, [{ id: 1 }])).toBe(false);
        expect(hasVisibleAppointments([], [{ id: 1 }])).toBe(false);
    });
});

describe('agendaRangeTense', () => {
    it('reads today, and the week that holds it, as current until they end', () => {
        expect(agendaRangeTense(NOW, 'day', NOW)).toBe('current');
        expect(agendaRangeTense(NOW.set({ hour: 23 }), 'day', NOW)).toBe(
            'current',
        );
        expect(agendaRangeTense(NOW.plus({ days: 3 }), 'week', NOW)).toBe(
            'current',
        );
    });

    it('tells a range already over from one still to come', () => {
        expect(agendaRangeTense(NOW.minus({ days: 1 }), 'day', NOW)).toBe(
            'past',
        );
        expect(agendaRangeTense(NOW.plus({ days: 1 }), 'day', NOW)).toBe(
            'future',
        );
        expect(agendaRangeTense(NOW.minus({ days: 7 }), 'week', NOW)).toBe(
            'past',
        );
        expect(agendaRangeTense(NOW.plus({ days: 7 }), 'week', NOW)).toBe(
            'future',
        );
    });
});

describe('agendaEmptyTitle', () => {
    it('speaks of today and this week in the present', () => {
        expect(agendaEmptyTitle(NOW, 'day', 'current')).toBe(
            'Hoy no tenés turnos',
        );
        expect(agendaEmptyTitle(NOW, 'week', 'current')).toBe(
            'Esta semana no tenés turnos',
        );
    });

    it('names the day or the week still to come', () => {
        expect(agendaEmptyTitle(NOW.plus({ days: 1 }), 'day', 'future')).toBe(
            'No tenés turnos el jueves, 6 de agosto',
        );
        expect(agendaEmptyTitle(NOW.plus({ days: 7 }), 'week', 'future')).toBe(
            'No tenés turnos la semana del 9 de agosto',
        );
    });

    it('speaks of a range already over in the past', () => {
        expect(agendaEmptyTitle(NOW, 'day', 'past')).toBe(
            'No hubo turnos ese día',
        );
        expect(agendaEmptyTitle(NOW, 'week', 'past')).toBe(
            'No hubo turnos esa semana',
        );
    });
});

describe('agendaEmptyDescription', () => {
    it('offers a manual appointment only to whoever can create one', () => {
        expect(agendaEmptyDescription('current', true)).toBe(
            'Compartí tu link de reservas para sumar turnos. También podés agendar un turno manualmente.',
        );
        expect(agendaEmptyDescription('future', false)).toBe(
            'Compartí tu link de reservas para sumar turnos.',
        );
    });

    it('says why there is nothing to share while writes are restricted', () => {
        expect(agendaEmptyDescription('current', true, 'subscription')).toBe(
            'Tu suscripción no está activa: la agenda es de solo lectura y el link de reservas no toma turnos.',
        );
        expect(agendaEmptyDescription('future', false, 'plan')).toMatch(
            /^El plan Gratis incluye un solo profesional activo/,
        );
    });

    it('leads back to today from a range already over', () => {
        expect(agendaEmptyDescription('past', true)).toBe(
            'Volvé a hoy para ver tus próximos turnos.',
        );
    });
});

describe('newAppointmentDay', () => {
    it('starts on the day shown in the day view', () => {
        const tomorrow = NOW.plus({ days: 1 });

        expect(newAppointmentDay(tomorrow, 'day', NOW)).toBe(tomorrow);
    });

    it('never starts a week on a day already over', () => {
        expect(newAppointmentDay(NOW, 'week', NOW)).toBe(NOW);
        expect(
            newAppointmentDay(NOW.plus({ days: 7 }), 'week', NOW).toISODate(),
        ).toBe('2026-08-09');
    });
});
