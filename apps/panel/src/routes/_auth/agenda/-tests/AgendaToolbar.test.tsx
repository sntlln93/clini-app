import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    AgendaToolbar,
    type AgendaViewMode,
} from '../-components/AgendaToolbar';

function renderToolbar(view: AgendaViewMode, showCancelled = false) {
    const props = {
        date: new Date(2026, 7, 5),
        view,
        onPrev: vi.fn(),
        onNext: vi.fn(),
        onToday: vi.fn(),
        onViewChange: vi.fn(),
        onDateSelect: vi.fn(),
        showCancelled,
        onShowCancelledChange: vi.fn(),
    };
    render(<AgendaToolbar {...props} />);
    return props;
}

describe('AgendaToolbar', () => {
    it.each<AgendaViewMode>(['day', 'week'])(
        'offers Hoy and the full date (with month and year) in the %s view',
        (view) => {
            const { onToday } = renderToolbar(view);

            expect(
                screen.getByText('miércoles, 5 de agosto de 2026'),
            ).toBeTruthy();
            fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
            expect(onToday).toHaveBeenCalledOnce();
        },
    );

    it('toggles "Mostrar cancelados"', () => {
        const { onShowCancelledChange } = renderToolbar('day');

        const toggle = screen.getByRole('switch', {
            name: 'Mostrar cancelados',
        });
        expect(toggle.getAttribute('aria-checked')).toBe('false');

        fireEvent.click(toggle);

        expect(onShowCancelledChange).toHaveBeenCalledWith(
            true,
            expect.anything(),
        );
    });
});
