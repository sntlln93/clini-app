import { render, screen } from '@testing-library/react';
import { InboxIcon } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
    it('renders title, description and action when all are provided', () => {
        render(
            <EmptyState
                icon={InboxIcon}
                title="No hay pacientes"
                description="Agregá tu primer paciente para empezar."
                action={<button type="button">Agregar paciente</button>}
            />,
        );

        expect(screen.getByText('No hay pacientes')).not.toBeNull();
        expect(
            screen.getByText('Agregá tu primer paciente para empezar.'),
        ).not.toBeNull();
        expect(
            screen.getByRole('button', { name: 'Agregar paciente' }),
        ).not.toBeNull();
    });

    it('renders only the title and no button when description and action are omitted', () => {
        render(<EmptyState icon={InboxIcon} title="No hay pacientes" />);

        expect(screen.getByText('No hay pacientes')).not.toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });
});
