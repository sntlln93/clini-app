import type { PatientAppointmentHistoryItem } from '@/types/patient';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findTodaysOwnAppointment } from '../-hooks/use-patient-appointments';

function buildAppointment(
    overrides: Partial<PatientAppointmentHistoryItem> = {},
): PatientAppointmentHistoryItem {
    return {
        id: 1,
        membership_id: 1,
        patient_id: 50,
        service_id: 100,
        status: 'scheduled',
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
