import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    blocksOf,
    dayColumn,
    renderSchedule,
    setDesktop,
} from './weekly-schedule-helpers';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), put: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return {
        ...actual,
        useRouter: () => ({ invalidate }),
        useBlocker: () => ({ status: 'idle' }),
    };
});

function panel() {
    return screen.getByRole('region', {
        name: /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)$/,
    });
}

function editRange(index: number, field: 'Desde' | 'Hasta', value: string) {
    const input = within(panel()).getAllByLabelText(field)[index];
    fireEvent.change(input, { target: { value } });
    fireEvent.focusOut(input);
}

describe('WeeklySchedule on desktop', () => {
    beforeEach(() => {
        setDesktop(true);
        vi.mocked(api.put).mockReset();
        invalidate.mockReset().mockResolvedValue(undefined);
        Element.prototype.setPointerCapture = vi.fn();
    });

    it('draws each day’s ranges as blocks, and "Sin atención" for the rest', () => {
        renderSchedule();

        expect(blocksOf('Lunes')).toEqual([
            'Lunes, 09:00 – 13:00',
            'Lunes, 16:00 – 19:00',
        ]);
        expect(blocksOf('Miércoles')).toEqual(['Miércoles, 09:00 – 13:00']);
        expect(within(dayColumn('Sábado')).getByText('Sin atención'));
        expect(blocksOf('Sábado')).toEqual([]);
    });

    it('opens the first day with ranges, and a block selects its day', () => {
        renderSchedule();

        screen.getByRole('region', { name: 'Lunes' });
        fireEvent.click(
            screen.getByRole('button', { name: 'Miércoles, 09:00 – 13:00' }),
        );
        screen.getByRole('region', { name: 'Miércoles' });
        expect(within(panel()).getByText('1 franja'));
    });

    it('edits a range from the day panel; Guardar and Descartar follow the draft', () => {
        renderSchedule();
        const save = screen.getByRole('button', { name: 'Guardar cambios' });
        expect(save).toHaveProperty('disabled', true);

        editRange(0, 'Hasta', '14:00');

        expect(blocksOf('Lunes')[0]).toBe('Lunes, 09:00 – 14:00');
        expect(save).toHaveProperty('disabled', false);

        fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
        expect(blocksOf('Lunes')[0]).toBe('Lunes, 09:00 – 13:00');
        expect(save).toHaveProperty('disabled', true);
    });

    it('merges a range edited into its neighbor', () => {
        renderSchedule();

        editRange(0, 'Hasta', '16:00');

        expect(blocksOf('Lunes')).toEqual(['Lunes, 09:00 – 19:00']);
    });

    it('keeps an inverted range out of the draft and says why', () => {
        renderSchedule();

        editRange(0, 'Hasta', '08:00');

        expect(
            within(panel()).getByText(
                'La hora de fin tiene que ser posterior a la de inicio.',
            ),
        );
        expect(blocksOf('Lunes')[0]).toBe('Lunes, 09:00 – 13:00');
    });

    it('adds and deletes ranges from the day panel', () => {
        renderSchedule();

        fireEvent.click(screen.getByRole('button', { name: 'Agregar franja' }));
        expect(blocksOf('Lunes')).toContain('Lunes, 20:00 – 21:00');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Eliminar franja de 09:00 – 13:00',
            }),
        );
        expect(blocksOf('Lunes')).toEqual([
            'Lunes, 16:00 – 19:00',
            'Lunes, 20:00 – 21:00',
        ]);
    });

    it('copies the day onto the chosen days', () => {
        renderSchedule();

        const chips = within(
            screen.getByRole('group', { name: 'Días a los que copiar' }),
        );
        fireEvent.click(chips.getByRole('button', { name: 'Martes' }));
        fireEvent.click(chips.getByRole('button', { name: 'Miércoles' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Copiar a otros días' }),
        );

        expect(blocksOf('Martes')).toEqual([
            'Martes, 09:00 – 13:00',
            'Martes, 16:00 – 19:00',
        ]);
        expect(blocksOf('Miércoles')).toHaveLength(2);
        expect(blocksOf('Jueves')).toEqual([]);
    });

    it('draws a new range by dragging on an empty column, snapped to 15 minutes', () => {
        renderSchedule();
        const column = dayColumn('Martes');

        // 56px per hour from 08:00: y=58 ≈ 09:02, y=170 ≈ 11:02.
        fireEvent.pointerDown(column, { button: 0, clientY: 58, pointerId: 1 });
        fireEvent.pointerMove(column, { clientY: 170, pointerId: 1 });
        fireEvent.pointerUp(column, { clientY: 170, pointerId: 1 });

        expect(blocksOf('Martes')).toEqual(['Martes, 09:00 – 11:00']);
        screen.getByRole('region', { name: 'Martes' });
    });

    it('moves a block by dragging it', () => {
        renderSchedule();
        const block = screen.getByRole('button', {
            name: 'Miércoles, 09:00 – 13:00',
        });

        fireEvent.pointerDown(block, { button: 0, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(block, { clientY: 156, pointerId: 1 });
        fireEvent.pointerUp(block, { clientY: 156, pointerId: 1 });

        expect(blocksOf('Miércoles')).toEqual(['Miércoles, 10:00 – 14:00']);
    });

    it('saves the whole week with one PUT', async () => {
        vi.mocked(api.put).mockResolvedValueOnce({ data: { data: [] } });
        renderSchedule();

        editRange(1, 'Desde', '15:00');
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith('Horarios guardados'),
        );
        expect(api.put).toHaveBeenCalledWith('/memberships/3/availabilities', {
            slots: [
                { day_of_week: 1, start_time: '09:00', end_time: '13:00' },
                { day_of_week: 1, start_time: '15:00', end_time: '19:00' },
                { day_of_week: 3, start_time: '09:00', end_time: '13:00' },
            ],
        });
        expect(invalidate).toHaveBeenCalled();
    });

    it('shows a 422 next to the save bar, naming the franja', async () => {
        vi.mocked(api.put).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 422,
                data: {
                    message: 'The given data was invalid.',
                    errors: {
                        'slots.2.end_time': [
                            'Ingresá la hora de fin con el formato HH:MM.',
                        ],
                    },
                },
            },
        });
        renderSchedule();

        editRange(0, 'Hasta', '12:00');
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        const alert = await screen.findByRole('alert');
        within(alert).getByText(
            'Miércoles de 09:00 a 13:00: Ingresá la hora de fin con el formato HH:MM.',
        );
        expect(notifySuccess).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        ).toHaveProperty('disabled', false);
    });

    it('hides every editing control while read-only', () => {
        renderSchedule({ readOnlyReason: 'subscription' });

        screen.getByText(/la suscripción no está activa/);
        expect(
            screen.queryByRole('button', { name: 'Guardar cambios' }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Agregar franja' }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Copiar a otros días' }),
        ).toBeNull();
        for (const input of within(panel()).getAllByLabelText('Desde')) {
            expect(input).toHaveProperty('disabled', true);
        }
        screen.getByText(/Estos horarios se repiten cada semana/);

        const column = dayColumn('Martes');
        fireEvent.pointerDown(column, { button: 0, clientY: 58, pointerId: 1 });
        fireEvent.pointerMove(column, { clientY: 170, pointerId: 1 });
        fireEvent.pointerUp(column, { clientY: 170, pointerId: 1 });
        expect(blocksOf('Martes')).toEqual([]);
    });
});
