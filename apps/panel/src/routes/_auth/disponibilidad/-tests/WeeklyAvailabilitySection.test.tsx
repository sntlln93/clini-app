import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyAvailabilitySection } from '../-components/WeeklyAvailabilitySection';
import type { AvailabilityReadOnlyReason } from '../-hooks/use-availability-permissions';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

const DAYS = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
];

function renderSection(readOnlyReason: AvailabilityReadOnlyReason | null) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <WeeklyAvailabilitySection
                membershipId={3}
                canManage={readOnlyReason === null}
                readOnlyReason={readOnlyReason}
                slots={[
                    {
                        id: 1,
                        membership_id: 3,
                        day_of_week: 0,
                        start_time: '10:00',
                        end_time: '12:00',
                    },
                ]}
            />
        </QueryClientProvider>,
    );
}

describe('WeeklyAvailabilitySection', () => {
    it('lists the week from Monday to Sunday', () => {
        renderSection(null);

        const labels = screen
            .getAllByText(new RegExp(`^(${DAYS.join('|')})$`))
            .map((element) => element.textContent);
        expect(labels).toEqual(DAYS);
    });

    it('keeps a Sunday slot (day_of_week 0) under Domingo, now last', () => {
        renderSection(null);

        const sunday = screen.getByText('Domingo').parentElement;
        expect(sunday?.querySelector('input[value="10:00"]')).not.toBeNull();
    });

    it('shows no read-only note when the user can edit', () => {
        renderSection(null);

        expect(screen.queryByText(/Solo lectura/)).toBeNull();
    });

    it.each([
        ['subscription', /la suscripción no está activa/],
        ['permission', /no tenés permiso para editar/],
    ] as const)('explains a read-only %s restriction', (reason, copy) => {
        renderSection(reason);

        screen.getByText(copy);
        expect(
            screen.queryByRole('button', { name: 'Agregar franja' }),
        ).toBeNull();
    });
});
