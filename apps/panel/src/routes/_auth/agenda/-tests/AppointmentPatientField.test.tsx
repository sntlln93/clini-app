import { Form } from '@/components/ui/form';
import type { Patient } from '@/types/patient';
import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
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
    insurance_member_number: null,
    created_at: '2026-01-01T00:00:00Z',
};

type WrapperProps = {
    patients?: Patient[];
    emptySearch?: string | null;
    onCreatePatient?: () => void;
};

function Wrapper({
    patients = [PATIENT],
    emptySearch = null,
    onCreatePatient,
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
                onCreatePatient={onCreatePatient}
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

    // The search hits /patients, which also matches the member number (#290).
    it('tells that the search also matches the member number', () => {
        render(<Wrapper />);

        expect(
            screen.getByRole('textbox', { name: 'Buscar paciente' }),
        ).toHaveProperty(
            'placeholder',
            'Buscar por nombre, documento o N° de afiliado…',
        );
    });

    it('shows no empty-state message while the search has results', () => {
        render(<Wrapper />);

        expect(screen.queryByText(/No encontramos pacientes/)).toBeNull();
    });

    // Leaving for /pacientes/nuevo would drop the appointment being filled in (#266).
    it('explains an empty search and offers to register the patient without leaving the dialog', () => {
        const onCreatePatient = vi.fn();
        render(
            <Wrapper
                patients={[]}
                emptySearch="Zoe"
                onCreatePatient={onCreatePatient}
            />,
        );

        expect(
            screen.getByText(/No encontramos pacientes con “Zoe”/),
        ).toBeTruthy();
        expect(screen.queryByRole('link')).toBeNull();
        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar paciente nuevo' }),
        );
        expect(onCreatePatient).toHaveBeenCalledOnce();
    });

    it('hides the register action without the patients.create permission', () => {
        render(<Wrapper patients={[]} emptySearch="Zoe" />);

        expect(screen.getByText(/No encontramos pacientes/)).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'Registrar paciente nuevo' }),
        ).toBeNull();
    });
});
