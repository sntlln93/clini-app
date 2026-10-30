import { buildContact } from '@/tests/fixtures/patient';
import type { Patient } from '@/types/patient';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PatientContactCard } from '../-components/PatientContactCard';
import { PatientInsuranceCard } from '../-components/PatientInsuranceCard';

const PATIENT: Patient = {
    id: 1,
    name: 'Ana Gomez',
    contacts: [],
    document_type: 'dni',
    document_number: '12345678',
    sex: null,
    birth_date: null,
    insurance_provider_id: null,
    insurance_member_number: null,
    insurance_provider: null,
    created_at: '2026-01-01T00:00:00Z',
};

describe('PatientContactCard', () => {
    it('links every contact by its type, with its label', () => {
        render(
            <PatientContactCard
                patient={{
                    ...PATIENT,
                    contacts: [
                        buildContact({
                            id: 1,
                            type: 'email',
                            value: 'ana@example.com',
                            display: 'ana@example.com',
                        }),
                        buildContact({ id: 2, label: 'trabajo' }),
                        buildContact({
                            id: 3,
                            type: 'whatsapp',
                            value: '+5491123456789',
                            display: '011 15-2345-6789',
                            label: 'madre',
                        }),
                    ],
                }}
            />,
        );

        expect(
            screen
                .getByRole('link', { name: 'ana@example.com' })
                .getAttribute('href'),
        ).toBe('mailto:ana@example.com');
        expect(
            screen
                .getByRole('link', { name: '011 4555-1234' })
                .getAttribute('href'),
        ).toBe('tel:+541145551234');
        expect(
            screen
                .getByRole('link', { name: '011 15-2345-6789' })
                .getAttribute('href'),
        ).toBe('https://wa.me/5491123456789');
        screen.getByText('Teléfono · trabajo');
        screen.getByText('WhatsApp · madre');
        expect(screen.queryByText('Sin confirmar')).toBeNull();
    });

    it('marks a contact an online booking added and nobody confirmed yet', () => {
        render(
            <PatientContactCard
                patient={{
                    ...PATIENT,
                    contacts: [buildContact({ needs_confirmation: true })],
                }}
            />,
        );

        screen.getByText('Sin confirmar');
        screen.getByText(/no recibe recordatorios/);
    });

    it('says so, with no link, when the patient has no contacts', () => {
        render(<PatientContactCard patient={PATIENT} />);

        expect(screen.queryByRole('link')).toBeNull();
        screen.getByText('Sin datos de contacto.');
    });
});

describe('PatientInsuranceCard', () => {
    it('shows the provider name with its member number', () => {
        render(
            <PatientInsuranceCard
                patient={{
                    insurance_provider: { id: 1, name: 'OSDE' },
                    insurance_member_number: '37415820',
                }}
            />,
        );

        expect(screen.getByText('OSDE')).toBeTruthy();
        expect(screen.getByText('N° de afiliado: 37415820')).toBeTruthy();
    });

    it('marks a patient without insurance as private', () => {
        render(<PatientInsuranceCard patient={PATIENT} />);

        expect(screen.getByText('Particular (sin obra social)')).toBeTruthy();
        expect(screen.queryByText(/N° de afiliado/)).toBeNull();
    });
});
