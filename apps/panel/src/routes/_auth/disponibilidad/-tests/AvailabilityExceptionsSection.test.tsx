import { api } from '@/lib/api';
import type { AvailabilityException } from '@/types/availability';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityExceptionsSection } from '../-components/AvailabilityExceptionsSection';
import type { AvailabilityReadOnlyReason } from '../-hooks/use-availability-permissions';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

// Buenos Aires (UTC-3): the practice's midnight is 03:00Z.
const VACATION: AvailabilityException = {
    id: 12,
    membership_id: 3,
    type: 'blocked',
    start_at: '2027-01-04T03:00:00Z',
    end_at: '2027-01-16T03:00:00Z',
    reason: 'Vacaciones',
};
const SATURDAY: AvailabilityException = {
    id: 13,
    membership_id: 3,
    type: 'extra',
    start_at: '2026-11-07T12:00:00Z',
    end_at: '2026-11-07T16:00:00Z',
    reason: null,
};
const HOLIDAY: AvailabilityException = {
    id: 14,
    membership_id: null,
    type: 'blocked',
    start_at: '2026-11-23T03:00:00Z',
    end_at: '2026-11-24T03:00:00Z',
    reason: 'Feriado',
};
const FINISHED: AvailabilityException = {
    id: 15,
    membership_id: 3,
    type: 'blocked',
    start_at: '2026-10-05T03:00:00Z',
    end_at: '2026-10-06T03:00:00Z',
    reason: 'Congreso',
};

function renderSection({
    exceptions = [VACATION, SATURDAY, HOLIDAY, FINISHED],
    readOnlyReason = null,
    canManageOrgWide = false,
}: {
    exceptions?: AvailabilityException[];
    readOnlyReason?: AvailabilityReadOnlyReason | null;
    canManageOrgWide?: boolean;
} = {}) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <AvailabilityExceptionsSection
                membershipId={3}
                heading="Tus excepciones"
                canManageOwn={readOnlyReason === null}
                canManageOrgWide={canManageOrgWide}
                readOnlyReason={readOnlyReason}
                exceptions={exceptions}
            />
        </QueryClientProvider>,
    );
}

function itemTitles(list: HTMLElement) {
    return within(list)
        .getAllByRole('listitem')
        .map((item) => item.querySelector('p.font-medium')?.textContent);
}

describe('AvailabilityExceptionsSection', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-01T15:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('lists the upcoming exceptions soonest first and folds the finished ones away', () => {
        renderSection();

        screen.getByText(/Estas fechas cambian la semana habitual/);
        const [upcoming] = screen.getAllByRole('list');
        expect(itemTitles(upcoming)).toEqual([
            'Horas adicionales',
            'Feriado',
            'Vacaciones',
        ]);
        expect(screen.queryByText('Congreso')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Anteriores (1)' }));

        screen.getByText('Congreso');
    });

    it('labels each exception with its dates, type and detail', () => {
        renderSection({ exceptions: [VACATION, SATURDAY, HOLIDAY] });

        const [saturday, holiday, vacation] = screen.getAllByRole('listitem');
        within(vacation).getByText('4 – 15 ene 2027');
        within(vacation).getByText('Sin atención');
        within(vacation).getByText('12 días');
        within(saturday).getByText('7 nov 2026');
        within(saturday).getByText('09:00 – 13:00');
        expect(within(saturday).getAllByText('Horas adicionales')).toHaveLength(
            2,
        );
        within(holiday).getByText('Todo el día');
        within(holiday).getByText('Todo el consultorio');
    });

    it('says when nothing is ahead', () => {
        renderSection({ exceptions: [FINISHED] });

        screen.getByText('No hay excepciones próximas.');
    });

    it('offers actions only on the rows the user may manage', () => {
        renderSection({ exceptions: [VACATION, HOLIDAY] });

        screen.getByRole('button', {
            name: 'Editar Vacaciones, 4 – 15 ene 2027',
        });
        expect(
            screen.queryByRole('button', { name: /Editar Feriado/ }),
        ).toBeNull();
    });

    it('requires confirmation before deleting an exception', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        renderSection({ exceptions: [VACATION] });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Eliminar Vacaciones, 4 – 15 ene 2027',
            }),
        );
        expect(api.delete).not.toHaveBeenCalled();

        fireEvent.click(
            within(await screen.findByRole('alertdialog')).getByRole('button', {
                name: 'Eliminar',
            }),
        );

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith(
                '/availability-exceptions/12',
            ),
        );
        await waitFor(() => expect(invalidate).toHaveBeenCalled());
    });

    it('opens the form prefilled to edit an exception', async () => {
        renderSection({ exceptions: [VACATION] });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Editar Vacaciones, 4 – 15 ene 2027',
            }),
        );

        const dialog = await screen.findByRole('dialog');
        within(dialog).getByText('Editar excepción');
        expect(
            within(dialog).getByLabelText<HTMLInputElement>('Hasta').value,
        ).toBe('2027-01-15');
    });

    it('opens an empty form to add one', async () => {
        renderSection({ exceptions: [] });

        fireEvent.click(
            screen.getByRole('button', { name: 'Agregar excepción' }),
        );

        within(await screen.findByRole('dialog')).getByText('Nueva excepción');
    });

    it('explains why the section is read-only and offers no actions', () => {
        renderSection({ readOnlyReason: 'permission' });

        screen.getByText(/no tenés permiso para editar la disponibilidad/);
        expect(
            screen.queryByRole('button', { name: 'Agregar excepción' }),
        ).toBeNull();
        expect(screen.queryByRole('button', { name: /^Editar/ })).toBeNull();
    });
});
