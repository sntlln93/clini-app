import { buildProfessional } from '@/tests/fixtures/professional';
import type { Appointment } from '@/types/appointment';
import { describe, expect, it } from 'vitest';
import {
    buildWaitingQueues,
    displayPatientName,
    todayRange,
} from '../-components/waiting-room';

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
    return {
        id: 1,
        membership_id: 1,
        patient_id: 50,
        service_id: 100,
        status: 'arrived',
        origin: 'manual',
        start_at: '2026-08-03T10:00:00',
        end_at: '2026-08-03T10:30:00',
        reason: null,
        notes: null,
        cancelled_at: null,
        cancellation_reason: null,
        rescheduled_from_id: null,
        arrived_at: '2026-08-03T09:50:00',
        patient_name: 'Juan Pérez',
        ...overrides,
    };
}

describe('displayPatientName', () => {
    it('shows the first name plus the last word initial', () => {
        expect(displayPatientName('María Gómez')).toBe('María G.');
        expect(displayPatientName('María José García López')).toBe('María L.');
    });

    it('collapses surrounding and repeated whitespace', () => {
        expect(displayPatientName('  Lucía   fernández ')).toBe('Lucía F.');
    });

    it('keeps a single-word name as is', () => {
        expect(displayPatientName('Martín')).toBe('Martín');
    });

    it('falls back to a generic label when the name is missing', () => {
        expect(displayPatientName(null)).toBe('Paciente');
        expect(displayPatientName(undefined)).toBe('Paciente');
        expect(displayPatientName('   ')).toBe('Paciente');
    });
});

describe('buildWaitingQueues', () => {
    const ana = buildProfessional({ id: 1 });
    const beto = buildProfessional({
        id: 2,
        user: { id: 20, name: 'Dr. Beto Ruiz', email: 'beto@example.com' },
    });

    it('returns one queue per professional in roster order, empty when nobody is waiting', () => {
        const queues = buildWaitingQueues([beto, ana], []);

        expect(queues.map((queue) => queue.professional.id)).toEqual([2, 1]);
        expect(queues.every((queue) => queue.waiting.length === 0)).toBe(true);
    });

    it('groups arrived appointments by professional', () => {
        const queues = buildWaitingQueues(
            [ana, beto],
            [
                buildAppointment({ id: 10, membership_id: 1 }),
                buildAppointment({ id: 11, membership_id: 2 }),
                buildAppointment({ id: 12, membership_id: 1 }),
            ],
        );

        expect(queues[0].waiting.map((a) => a.id)).toEqual([10, 12]);
        expect(queues[1].waiting.map((a) => a.id)).toEqual([11]);
    });

    it('orders by arrival time, earliest first, regardless of appointment start', () => {
        const [queue] = buildWaitingQueues(
            [ana],
            [
                buildAppointment({
                    id: 1,
                    start_at: '2026-08-03T09:00:00',
                    arrived_at: '2026-08-03T09:40:00',
                }),
                buildAppointment({
                    id: 2,
                    start_at: '2026-08-03T10:00:00',
                    arrived_at: '2026-08-03T09:20:00',
                }),
            ],
        );

        expect(queue.waiting.map((a) => a.id)).toEqual([2, 1]);
    });

    it('falls back to the appointment start when the arrival time is missing', () => {
        const [queue] = buildWaitingQueues(
            [ana],
            [
                buildAppointment({
                    id: 1,
                    start_at: '2026-08-03T11:00:00',
                    arrived_at: null,
                }),
                buildAppointment({
                    id: 2,
                    start_at: '2026-08-03T09:30:00',
                    arrived_at: null,
                }),
            ],
        );

        expect(queue.waiting.map((a) => a.id)).toEqual([2, 1]);
    });

    it('ignores non-arrived appointments and professionals outside the roster', () => {
        const [queue] = buildWaitingQueues(
            [ana],
            [
                buildAppointment({ id: 1, status: 'confirmed' }),
                buildAppointment({ id: 2, status: 'completed' }),
                buildAppointment({ id: 3, membership_id: 99 }),
                buildAppointment({ id: 4 }),
            ],
        );

        expect(queue.waiting.map((a) => a.id)).toEqual([4]);
    });
});

describe('todayRange', () => {
    it('spans the local day of the given instant', () => {
        const now = new Date(2026, 7, 3, 15, 30);
        const start = new Date(2026, 7, 3, 0, 0, 0, 0);
        const end = new Date(2026, 7, 3, 23, 59, 59, 999);

        expect(todayRange(now)).toEqual({
            from: start.toISOString(),
            to: end.toISOString(),
        });
    });
});
