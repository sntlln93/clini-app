import type { Patient } from '@/types/patient';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PatientContactCard } from '../-components/PatientContactCard';
import { PatientInsuranceCard } from '../-components/PatientInsuranceCard';

const PATIENT: Patient = {
    id: 1,
    name: 'Ana Gomez',
    email: 'ana@example.com',
    phone: '(011) 4555-1234',
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
    it('links the email and phone, stripping separators from the tel: href', () => {
        render(<PatientContactCard patient={PATIENT} />);

        expect(
            screen
                .getByRole('link', { name: 'ana@example.com' })
                .getAttribute('href'),
        ).toBe('mailto:ana@example.com');
        expect(
            screen
                .getByRole('link', { name: '(011) 4555-1234' })
                .getAttribute('href'),
        ).toBe('tel:01145551234');
    });

    it('shows a dash and no link when the contact data is missing', () => {
        render(
            <PatientContactCard
                patient={{ ...PATIENT, email: null, phone: null }}
            />,
        );

        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getAllByText('—')).toHaveLength(2);
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
