import type { Prescription } from '@/types/prescription';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrescriptionPrintView } from '../-components/PrescriptionPrintView';

function buildPrescription(
    overrides: Partial<Prescription> = {},
): Prescription {
    return {
        id: 7,
        appointment_id: 42,
        patient_id: 50,
        membership_id: 1,
        diagnosis: 'Faringitis aguda',
        issued_at: '2026-08-03T10:15:00',
        created_at: '2026-08-03T10:15:00',
        updated_at: '2026-08-03T10:15:00',
        items: [
            {
                id: 1,
                position: 0,
                medication: 'Amoxicilina',
                presentation: 'Comprimidos 500 mg',
                dosage: '1 cada 8 h por 7 días',
                quantity: 2,
            },
            {
                id: 2,
                position: 1,
                medication: 'Ibuprofeno',
                presentation: null,
                dosage: 'Si hay dolor',
                quantity: 1,
            },
        ],
        patient_name: 'Juan Pérez',
        patient_document_type: 'dni',
        patient_document_number: '30111222',
        author_name: 'Dra. Ana Gomez',
        author_specialties: ['Clínica médica', 'Pediatría'],
        ...overrides,
    };
}

describe('PrescriptionPrintView', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders professional, patient, diagnosis, items and the no-validity legend', () => {
        render(<PrescriptionPrintView prescription={buildPrescription()} />);

        expect(screen.getByText('Dra. Ana Gomez')).toBeTruthy();
        expect(screen.getByText('Clínica médica · Pediatría')).toBeTruthy();
        expect(screen.getByText('Juan Pérez')).toBeTruthy();
        expect(screen.getByText('DNI 30111222')).toBeTruthy();
        expect(screen.getByText('Faringitis aguda')).toBeTruthy();

        const items = within(
            screen.getByRole('region', { name: 'Medicamentos' }),
        ).getAllByRole('listitem');
        expect(items).toHaveLength(2);
        expect(items[0].textContent).toContain(
            'Amoxicilina — Comprimidos 500 mg',
        );
        expect(items[0].textContent).toContain('Cantidad: 2');
        expect(items[0].textContent).toContain(
            'Indicaciones: 1 cada 8 h por 7 días',
        );
        expect(items[1].textContent).toContain('Ibuprofeno');
        expect(items[1].textContent).not.toContain('—');

        expect(
            screen.getByText('Documento sin validez como receta electrónica'),
        ).toBeTruthy();
    });

    it('omits the diagnosis and specialties lines when absent', () => {
        render(
            <PrescriptionPrintView
                prescription={buildPrescription({
                    diagnosis: null,
                    author_specialties: [],
                })}
            />,
        );

        expect(screen.queryByText('Diagnóstico:')).toBeNull();
        expect(screen.queryByText(/Clínica médica/)).toBeNull();
    });

    it('the Imprimir button opens the browser print dialog and is hidden on paper', () => {
        const print = vi.spyOn(window, 'print').mockImplementation(() => {});
        render(<PrescriptionPrintView prescription={buildPrescription()} />);

        const button = screen.getByRole('button', { name: 'Imprimir' });
        expect(button.closest('.print\\:hidden')).not.toBeNull();

        fireEvent.click(button);

        expect(print).toHaveBeenCalledTimes(1);
    });
});
