import { Form } from '@/components/ui/form';
import type { Patient } from '@/types/patient';
import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { AppointmentPatientField } from '../-components/AppointmentPatientField';
import {
    appointmentSchema,
    type AppointmentFormValues,
} from '../-components/appointment-schemas';

const PATIENT: Patient = {
    id: 50,
    name: 'Juan Pérez',
    email: null,
    phone: null,
    document_type: 'dni',
    document_number: '30111222',
    sex: null,
    birth_date: null,
    insurance_provider_id: null,
    created_at: '2026-01-01T00:00:00Z',
};

type WrapperProps = {
    patients?: Patient[];
    emptySearch?: string | null;
    canCreatePatient?: boolean;
};

function Wrapper({
    patients = [PATIENT],
    emptySearch = null,
    canCreatePatient = true,
}: WrapperProps) {
    const form = useForm<AppointmentFormValues>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: {
            membershipId: null,
            serviceId: null,
            patientId: PATIENT.id,
            date: '',
            time: '',
            reason: '',
        },
    });

    return (
        <Form {...form}>
            <AppointmentPatientField
                control={form.control}
                patients={patients}
                patientQuery={emptySearch ?? ''}
                onPatientQueryChange={() => {}}
                emptySearch={emptySearch}
                canCreatePatient={canCreatePatient}
            />
        </Form>
    );
}

describe('AppointmentPatientField', () => {
    it('shows the preset patient name at mount, not the id', () => {
        render(<Wrapper />);

        const patientTrigger = screen.getByRole('combobox', {
            name: 'Paciente',
        });
        expect(patientTrigger.textContent).toContain('Juan Pérez — 30111222');
        expect(patientTrigger.textContent).not.toContain('50');
    });

    it('gives the search input its own accessible name', () => {
        render(<Wrapper />);

        expect(
            screen.getByRole('textbox', { name: 'Buscar paciente' }),
        ).toBeTruthy();
    });

    it('shows no empty-state message while the search has results', () => {
        render(<Wrapper />);

        expect(screen.queryByText(/No encontramos pacientes/)).toBeNull();
    });

    it('explains an empty search and links to register a new patient in a new tab', () => {
        render(<Wrapper patients={[]} emptySearch="Zoe" />);

        expect(
            screen.getByText(/No encontramos pacientes con “Zoe”/),
        ).toBeTruthy();
        const link = screen.getByRole('link', {
            name: 'Registrar paciente nuevo',
        });
        expect(link.getAttribute('href')).toBe('/pacientes/nuevo');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('hides the register link without the patients.create permission', () => {
        render(
            <Wrapper
                patients={[]}
                emptySearch="Zoe"
                canCreatePatient={false}
            />,
        );

        expect(screen.getByText(/No encontramos pacientes/)).toBeTruthy();
        expect(
            screen.queryByRole('link', { name: 'Registrar paciente nuevo' }),
        ).toBeNull();
    });
});
