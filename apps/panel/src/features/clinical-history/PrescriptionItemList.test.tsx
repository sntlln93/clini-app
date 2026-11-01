import { AMOXICILLIN } from '@/tests/fixtures/prescription';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrescriptionItemList } from './PrescriptionItemList';

// #377: an item picked from the catalog keeps its product's marks in the
// history; a free-text one has none.
describe('PrescriptionItemList', () => {
    it('shows the marks the item copied from its product', () => {
        render(
            <PrescriptionItemList
                items={[
                    {
                        ...AMOXICILLIN,
                        gtin: '07795375000702',
                        substances: ['ibuprofeno', 'codeina'],
                        dispensing_condition: 'Venta Bajo Receta Archivada',
                        control_mark: 'ESTUPEFACIENTE III',
                        composition_incomplete: false,
                    },
                ]}
            />,
        );

        expect(screen.getByText('Estupefaciente III')).toBeTruthy();
        expect(screen.getByText('Receta archivada')).toBeTruthy();
    });

    it('marks nothing on a free-text item', () => {
        const { container } = render(
            <PrescriptionItemList items={[AMOXICILLIN]} />,
        );

        expect(container.querySelector('[data-tone]')).toBeNull();
    });
});
