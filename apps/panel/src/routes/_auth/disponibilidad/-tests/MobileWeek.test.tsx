import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    blocksOf,
    renderSchedule,
    setDesktop,
} from './weekly-schedule-helpers';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), put: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return {
        ...actual,
        useRouter: () => ({ invalidate: vi.fn() }),
        useBlocker: () => ({ status: 'idle' }),
    };
});

function dayPills() {
    return within(screen.getByRole('group', { name: 'Día' }));
}

describe('WeeklySchedule on mobile', () => {
    beforeEach(() => setDesktop(false));

    it('shows one day at a time, picked from the day pills', () => {
        renderSchedule();

        dayPills().getByRole('button', { name: 'Lunes, 2 franjas' });
        dayPills().getByRole('button', { name: 'Sábado, sin atención' });
        expect(blocksOf('Lunes')).toHaveLength(2);
        expect(screen.queryByRole('group', { name: 'Miércoles' })).toBeNull();

        fireEvent.click(
            dayPills().getByRole('button', { name: 'Sábado, sin atención' }),
        );

        expect(
            screen.getByRole('group', { name: 'Sábado' }).textContent,
        ).toContain('Sin atención');
    });

    it('edits a range in a bottom sheet', async () => {
        renderSchedule();

        fireEvent.click(
            screen.getByRole('button', { name: 'Lunes, 16:00 – 19:00' }),
        );
        const sheet = await screen.findByRole('dialog', {
            name: 'Editar franja',
        });
        fireEvent.change(within(sheet).getByLabelText('Desde'), {
            target: { value: '15:00' },
        });
        within(sheet).getByText('4 h de atención');
        fireEvent.click(within(sheet).getByRole('button', { name: 'Aplicar' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(blocksOf('Lunes')).toEqual([
            'Lunes, 09:00 – 13:00',
            'Lunes, 15:00 – 19:00',
        ]);
        expect(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        ).toHaveProperty('disabled', false);
    });

    it('deletes a range from the sheet', async () => {
        renderSchedule();

        fireEvent.click(
            screen.getByRole('button', { name: 'Lunes, 09:00 – 13:00' }),
        );
        const sheet = await screen.findByRole('dialog');
        fireEvent.click(
            within(sheet).getByRole('button', { name: 'Eliminar franja' }),
        );

        await waitFor(() => expect(blocksOf('Lunes')).toHaveLength(1));
    });

    it('adds a range through a new-range sheet', async () => {
        renderSchedule();

        fireEvent.click(screen.getByRole('button', { name: 'Agregar franja' }));
        const sheet = await screen.findByRole('dialog', {
            name: 'Nueva franja',
        });
        expect(
            within(sheet).queryByRole('button', { name: 'Eliminar franja' }),
        ).toBeNull();
        fireEvent.click(within(sheet).getByRole('button', { name: 'Aplicar' }));

        await waitFor(() =>
            expect(blocksOf('Lunes')).toContain('Lunes, 20:00 – 21:00'),
        );
    });

    it('copies the day from a sheet', async () => {
        renderSchedule();

        fireEvent.click(
            screen.getByRole('button', { name: 'Copiar a otros días' }),
        );
        const sheet = await screen.findByRole('dialog', {
            name: 'Copiar a otros días',
        });
        fireEvent.click(within(sheet).getByRole('button', { name: 'Viernes' }));
        fireEvent.click(
            within(sheet).getByRole('button', { name: 'Copiar a otros días' }),
        );

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        fireEvent.click(
            dayPills().getByRole('button', { name: 'Viernes, 2 franjas' }),
        );
        expect(blocksOf('Viernes')).toHaveLength(2);
    });

    it('draws the blocks without opening anything while read-only', () => {
        renderSchedule({ readOnlyReason: 'permission' });

        expect(blocksOf('Lunes')).toEqual([]);
        expect(
            screen.getByRole('group', { name: 'Lunes' }).textContent,
        ).toContain('09:00 – 13:00');
        expect(
            screen.queryByRole('button', { name: 'Agregar franja' }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Guardar cambios' }),
        ).toBeNull();
    });
});
