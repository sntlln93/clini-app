import { Form } from '@/components/ui/form';
import type { Membership } from '@/types/membership';
import type { ProfessionalService } from '@/types/professional';
import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { AppointmentProfessionalFields } from '../-components/AppointmentProfessionalFields';
import {
    appointmentSchema,
    type AppointmentFormValues,
} from '../-components/appointment-schemas';

const PROFESSIONAL: Membership = {
    id: 1,
    user: { id: 10, name: 'Dra. Ana López', email: 'ana@example.com' },
    roles: ['professional'],
    status: 'active',
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

const SERVICE: ProfessionalService = {
    id: 100,
    membership_id: 1,
    service_id: 5,
    service_name: 'Consulta general',
    duration_minutes: 30,
    price_cents: 5000,
    active: true,
};

function Wrapper() {
    const form = useForm<AppointmentFormValues>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: {
            membershipId: PROFESSIONAL.id,
            serviceId: SERVICE.service_id,
            patientId: null,
            date: '',
            time: '',
            reason: '',
        },
    });

    return (
        <Form {...form}>
            <AppointmentProfessionalFields
                control={form.control}
                professionals={[PROFESSIONAL]}
                services={[SERVICE]}
            />
        </Form>
    );
}

describe('AppointmentProfessionalFields', () => {
    it('shows the preset professional and service names at mount, not their ids', () => {
        render(<Wrapper />);

        const professionalTrigger = screen.getByRole('combobox', {
            name: 'Profesional',
        });
        expect(professionalTrigger.textContent).toContain('Dra. Ana López');
        expect(professionalTrigger.textContent).not.toContain('1');

        const serviceTrigger = screen.getByRole('combobox', {
            name: 'Servicio',
        });
        expect(serviceTrigger.textContent).toContain('Consulta general');
        expect(serviceTrigger.textContent).not.toContain('5');
    });
});
