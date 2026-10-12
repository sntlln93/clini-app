import { DateTime, setPracticeTimeZone } from '@/lib/datetime';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { agendaNavigation } from '../-components/agenda-navigation';
import {
    describeAppointment,
    formatAppointmentMoment,
} from '../-components/appointment-format';
import { filterAgendaAppointments } from '../-components/appointment-status';
import { dayHourRange } from '../-components/day-hour-range';

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
    return {
        id: 1,
        membership_id: 1,
        patient_id: 50,
        service_id: 100,
        status: 'scheduled',
        origin: 'manual',
        start_at: '2026-08-03T10:00:00',
        end_at: '2026-08-03T10:30:00',
        reason: null,
        notes: null,
        cancelled_at: null,
        cancellation_reason: null,
        rescheduled_from_id: null,
        reported_insurance_provider_id: null,
        reported_insurance_member_number: null,
        arrived_at: null,
        ...overrides,
    };
}

describe('dayHourRange', () => {
    const date = DateTime.local(2026, 8, 3);

    it('defaults to 8–20 when every appointment fits inside it', () => {
        expect(dayHourRange([buildAppointment()], date)).toEqual({
            startHour: 8,
            endHour: 20,
        });
    });

    it('starts earlier for a 07:00 appointment', () => {
        const early = buildAppointment({
            start_at: '2026-08-03T07:00:00',
            end_at: '2026-08-03T07:30:00',
        });

        expect(dayHourRange([early], date).startHour).toBe(7);
    });

    it('ends on the hour after a 21:00–21:30 appointment', () => {
        const late = buildAppointment({
            start_at: '2026-08-03T21:00:00',
            end_at: '2026-08-03T21:30:00',
        });

        expect(dayHourRange([late], date).endHour).toBe(22);
    });

    it('clamps an appointment ending past midnight to 24', () => {
        const overnight = buildAppointment({
            start_at: '2026-08-03T23:30:00',
            end_at: '2026-08-04T00:30:00',
        });

        expect(dayHourRange([overnight], date).endHour).toBe(24);
    });

    it('ignores appointments on other days', () => {
        const otherDay = buildAppointment({
            start_at: '2026-08-04T06:00:00',
            end_at: '2026-08-04T06:30:00',
        });

        expect(dayHourRange([otherDay], date).startHour).toBe(8);
    });
});

describe('filterAgendaAppointments', () => {
    const statuses: AppointmentStatus[] = [
        'scheduled',
        'cancelled',
        'rescheduled',
        'completed',
    ];
    const appointments = statuses.map((status, index) =>
        buildAppointment({ id: index + 1, status }),
    );

    it('hides cancelled and rescheduled appointments by default', () => {
        expect(
            filterAgendaAppointments(appointments, false).map((a) => a.status),
        ).toEqual(['scheduled', 'completed']);
    });

    it('keeps every appointment when the toggle is on', () => {
        expect(filterAgendaAppointments(appointments, true)).toHaveLength(4);
    });
});

describe('appointment formatting', () => {
    it('formats a moment for toasts in es-AR local time', () => {
        expect(formatAppointmentMoment('2026-08-03T13:00:00.000Z')).toBe(
            'lunes 3 de agosto a las 10:00',
        );
    });

    it('describes an appointment by patient, professional and short local date', () => {
        expect(
            describeAppointment(
                buildAppointment({
                    patient_name: 'Juan Pérez',
                    professional_name: 'Dra. Ana López',
                }),
            ),
        ).toBe('Turno de Juan Pérez con Dra. Ana López · lun 3 ago, 10:00');
    });

    it('omits the professional when the API did not include it', () => {
        expect(describeAppointment(buildAppointment())).toBe(
            'Turno de Paciente #50 · lun 3 ago, 10:00',
        );
    });
});

describe('agendaNavigation', () => {
    it('drops showCancelled from the URL when the toggle is turned off', () => {
        const setSearch = vi.fn();
        const navigation = agendaNavigation({
            date: DateTime.local(2026, 8, 3),
            view: 'day',
            professionalsCount: 2,
            setSearch,
        });

        navigation.onShowCancelledChange(true);
        navigation.onShowCancelledChange(false);

        expect(setSearch).toHaveBeenNthCalledWith(1, { showCancelled: true });
        expect(setSearch).toHaveBeenNthCalledWith(2, {
            showCancelled: undefined,
        });
    });

    it('steps one week at a time in the week view', () => {
        const setSearch = vi.fn();
        agendaNavigation({
            date: DateTime.local(2026, 8, 3),
            view: 'week',
            professionalsCount: 2,
            setSearch,
        }).onNext();

        expect(setSearch).toHaveBeenCalledWith({ date: '2026-08-10' });
    });
});

describe("the practice's zone, not the browser's (#265)", () => {
    afterEach(() => setPracticeTimeZone(null));

    it("formats and lays out appointments in the practice's wall clock", () => {
        // Bogotá is UTC-5; the browser runs in Buenos Aires (UTC-3).
        setPracticeTimeZone('America/Bogota');
        const appointment = buildAppointment({
            start_at: '2026-08-03T12:00:00.000000Z',
            end_at: '2026-08-03T12:30:00.000000Z',
        });

        expect(formatAppointmentMoment(appointment.start_at)).toBe(
            'lunes 3 de agosto a las 07:00',
        );
        expect(
            dayHourRange([appointment], DateTime.local(2026, 8, 3)).startHour,
        ).toBe(7);
    });
});
