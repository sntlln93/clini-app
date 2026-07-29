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

function Wrapper() {
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
                patients={[PATIENT]}
                patientQuery=""
                onPatientQueryChange={() => {}}
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
});
