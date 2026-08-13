import type { PatientAppointmentHistoryItem } from '@/types/patient';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PatientAppointmentHistoryCard } from '../-components/PatientAppointmentHistoryCard';

function buildAppointment(
    overrides: Partial<PatientAppointmentHistoryItem> = {},
): PatientAppointmentHistoryItem {
    return {
        id: 1,
        membership_id: 1,
        patient_id: 50,
        service_id: 100,
        status: 'completed',
        start_at: '2026-08-03T10:00:00',
        end_at: '2026-08-03T10:30:00',
        professional_name: 'Dra. Ana Gomez',
        service_name: 'Consulta general',
        organization_name: 'Consultorio Central',
        is_own_membership: true,
        ...overrides,
    };
}

describe('PatientAppointmentHistoryCard', () => {
    it('renders one row per appointment showing date, service, professional, organization, status and attendance', () => {
        const appointment = buildAppointment();
        render(<PatientAppointmentHistoryCard appointments={[appointment]} />);

        const expectedDate = new Date(appointment.start_at).toLocaleString(
            'es-AR',
            { dateStyle: 'short', timeStyle: 'short' },
        );

        expect(screen.getByText(expectedDate)).toBeTruthy();
        expect(screen.getByText('Consulta general')).toBeTruthy();
        expect(screen.getByText('Dra. Ana Gomez')).toBeTruthy();
        expect(screen.getByText('Consultorio Central')).toBeTruthy();
        expect(screen.getByText('Completado')).toBeTruthy();
    });

    it('renders an empty state when the patient has no appointments', () => {
        render(<PatientAppointmentHistoryCard appointments={[]} />);

        expect(
            screen.getByText('Este paciente todavía no tiene turnos.'),
        ).toBeTruthy();
        expect(screen.queryByRole('table')).toBeNull();
    });
});
