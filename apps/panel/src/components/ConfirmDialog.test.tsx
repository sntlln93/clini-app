import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

const TITLE = 'Eliminar elemento';
const DESCRIPTION =
    '¿Eliminar este elemento? Esta acción no se puede deshacer.';

function renderUncontrolled(
    overrides: Partial<ComponentProps<typeof ConfirmDialog>> = {},
) {
    const onConfirm = vi.fn();
    render(
        <ConfirmDialog
            trigger={<button type="button">Abrir</button>}
            title={TITLE}
            description={DESCRIPTION}
            onConfirm={onConfirm}
            {...overrides}
        />,
    );
    return { onConfirm };
}

describe('ConfirmDialog', () => {
    it('renders the trigger and only shows the title/description after it is clicked', () => {
        renderUncontrolled();

        expect(screen.getByRole('button', { name: 'Abrir' })).toBeTruthy();
        expect(screen.queryByText(TITLE)).toBeNull();
        expect(screen.queryByText(DESCRIPTION)).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

        expect(screen.getByText(TITLE)).toBeTruthy();
        expect(screen.getByText(DESCRIPTION)).toBeTruthy();
    });

    it('calls onConfirm exactly once when the confirm button is clicked', () => {
        const { onConfirm } = renderUncontrolled();

        fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when the cancel button is clicked', () => {
        const { onConfirm } = renderUncontrolled();

        fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('renders the content in controlled mode with no click and reports closing via onOpenChange', () => {
        const onOpenChange = vi.fn();
        render(
            <ConfirmDialog
                open
                onOpenChange={onOpenChange}
                title={TITLE}
                description={DESCRIPTION}
                onConfirm={vi.fn()}
            />,
        );

        expect(screen.getByText(TITLE)).toBeTruthy();
        expect(screen.getByText(DESCRIPTION)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onOpenChange).toHaveBeenCalled();
        expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
    });

    it('renders custom confirm and cancel labels instead of the defaults', () => {
        renderUncontrolled({ confirmLabel: 'Eliminar', cancelLabel: 'Volver' });

        fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

        expect(screen.getByRole('button', { name: 'Eliminar' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Confirmar' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
    });

    it('renders the confirm button disabled while isPending', () => {
        renderUncontrolled({ isPending: true });

        fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

        expect(
            (
                screen.getByRole('button', {
                    name: 'Confirmar',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });

    it('renders the confirm button with the destructive variant classes', () => {
        renderUncontrolled();

        fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

        const confirmButton = screen.getByRole('button', {
            name: 'Confirmar',
        });
        expect(confirmButton.className.split(' ')).toContain(
            'text-destructive',
        );
    });
});
