import type { PatientAppointmentHistoryItem } from '@/types/patient';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    findNextAppointment,
    findTodaysOwnAppointment,
} from '../-hooks/use-patient-appointments';

function buildAppointment(
    overrides: Partial<PatientAppointmentHistoryItem> = {},
): PatientAppointmentHistoryItem {
    return {
        id: 1,
        membership_id: 1,
        patient_id: 50,
        service_id: 100,
        status: 'scheduled',
        origin: 'manual',
        start_at: '2026-08-13T10:00:00',
        end_at: '2026-08-13T10:30:00',
        professional_name: 'Dra. Ana Gomez',
        service_name: 'Consulta general',
        organization_name: 'Consultorio Central',
        is_own_membership: true,
        ...overrides,
    };
}

describe('findTodaysOwnAppointment', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-13T15:00:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns today's appointment when it belongs to the current membership", () => {
        const appointment = buildAppointment({
            is_own_membership: true,
            start_at: '2026-08-13T10:00:00',
        });

        expect(findTodaysOwnAppointment([appointment])).toBe(appointment);
    });

    it("returns null when today's appointment belongs to another membership", () => {
        const appointment = buildAppointment({
            is_own_membership: false,
            start_at: '2026-08-13T10:00:00',
        });

        expect(findTodaysOwnAppointment([appointment])).toBeNull();
    });

    it("returns null when the current membership's appointment is on another day", () => {
        const appointment = buildAppointment({
            is_own_membership: true,
            start_at: '2026-08-10T10:00:00',
        });

        expect(findTodaysOwnAppointment([appointment])).toBeNull();
    });

    it("returns null when today's own appointment is cancelled", () => {
        const appointment = buildAppointment({
            is_own_membership: true,
            status: 'cancelled',
            start_at: '2026-08-13T10:00:00',
        });

        expect(findTodaysOwnAppointment([appointment])).toBeNull();
    });
});

describe('findNextAppointment', () => {
    const now = new Date('2026-08-13T15:00:00');

    it('picks the closest upcoming appointment even though the history is sorted descending', () => {
        const later = buildAppointment({
            id: 3,
            start_at: '2026-09-01T10:00:00',
            end_at: '2026-09-01T10:30:00',
        });
        const sooner = buildAppointment({
            id: 2,
            status: 'confirmed',
            start_at: '2026-08-20T10:00:00',
            end_at: '2026-08-20T10:30:00',
        });
        const past = buildAppointment({
            id: 1,
            status: 'completed',
            start_at: '2026-08-01T10:00:00',
            end_at: '2026-08-01T10:30:00',
        });

        expect(findNextAppointment([later, sooner, past], now)).toBe(sooner);
    });

    it('counts an appointment still in progress', () => {
        const inProgress = buildAppointment({
            status: 'arrived',
            start_at: '2026-08-13T14:45:00',
            end_at: '2026-08-13T15:15:00',
        });

        expect(findNextAppointment([inProgress], now)).toBe(inProgress);
    });

    it.each(['cancelled', 'rescheduled', 'no_show', 'completed'] as const)(
        'ignores a future %s appointment',
        (status) => {
            const appointment = buildAppointment({
                status,
                start_at: '2026-08-20T10:00:00',
                end_at: '2026-08-20T10:30:00',
            });

            expect(findNextAppointment([appointment], now)).toBeNull();
        },
    );

    it('returns null when every appointment is in the past', () => {
        const past = buildAppointment({
            start_at: '2026-08-10T10:00:00',
            end_at: '2026-08-10T10:30:00',
        });

        expect(findNextAppointment([past], now)).toBeNull();
    });
});
