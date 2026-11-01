import type { Availability } from '@/types/availability';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { WeeklySchedule } from '../-components/WeeklySchedule';
import type { AvailabilityReadOnlyReason } from '../-hooks/use-availability-permissions';

export function slot(
    id: number,
    day: number,
    start: string,
    end: string,
): Availability {
    return {
        id,
        membership_id: 3,
        day_of_week: day,
        start_time: start,
        end_time: end,
    };
}

/** Monday 09:00–13:00 and 16:00–19:00, Wednesday 09:00–13:00. */
export const SLOTS = [
    slot(1, 1, '09:00', '13:00'),
    slot(2, 1, '16:00', '19:00'),
    slot(3, 3, '09:00', '13:00'),
];

/** `useMediaQuery` reads `matchMedia`; `true` puts the page in its desktop layout. */
export function setDesktop(matches: boolean) {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

export function renderSchedule({
    slots = SLOTS,
    readOnlyReason = null,
}: {
    slots?: Availability[];
    readOnlyReason?: AvailabilityReadOnlyReason | null;
} = {}) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <WeeklySchedule
                membershipId={3}
                heading="Tu semana habitual"
                canManage={readOnlyReason === null}
                readOnlyReason={readOnlyReason}
                slots={slots}
            />
        </QueryClientProvider>,
    );
}

export function dayColumn(name: string) {
    return screen.getByRole('group', { name });
}

export function blocksOf(name: string): string[] {
    return within(dayColumn(name))
        .queryAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? '');
}
