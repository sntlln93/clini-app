import { DateTime, isSameDay, startOfWeek } from '@/lib/datetime';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgendaDayStrip } from '../-components/AgendaDayStrip';

function expectedDayLabel(day: DateTime): string {
    return `${day.toLocaleString({ weekday: 'short' }).replace('.', '')} ${day.day}`;
}

function addDays(date: DateTime, days: number): DateTime {
    return date.plus({ days });
}

function dayButtons(): HTMLElement[] {
    return screen
        .getAllByRole('button')
        .filter((button) => button.hasAttribute('aria-pressed'));
}

describe('AgendaDayStrip', () => {
    // A Wednesday, so the week it belongs to runs Sunday–Saturday around it.
    const date = DateTime.local(2026, 8, 5);

    it('renders exactly 7 day buttons for the week, each labelled with the weekday abbreviation and day number', () => {
        render(<AgendaDayStrip date={date} onDateSelect={vi.fn()} />);

        const buttons = dayButtons();
        expect(buttons).toHaveLength(7);

        const weekStart = startOfWeek(date);
        buttons.forEach((button, index) => {
            const day = addDays(weekStart, index);
            expect(button.textContent).toBe(expectedDayLabel(day));
        });
    });

    it('marks exactly one day button as selected, matching the given date', () => {
        render(<AgendaDayStrip date={date} onDateSelect={vi.fn()} />);

        const selected = dayButtons().filter(
            (button) => button.getAttribute('aria-pressed') === 'true',
        );

        expect(selected).toHaveLength(1);
        expect(selected[0].textContent).toBe(expectedDayLabel(date));
    });

    it('calls onDateSelect with the clicked day when a different day in the strip is clicked', () => {
        const onDateSelect = vi.fn();
        render(<AgendaDayStrip date={date} onDateSelect={onDateSelect} />);

        const target = addDays(startOfWeek(date), 1); // Monday of that week

        fireEvent.click(
            screen.getByRole('button', { name: expectedDayLabel(target) }),
        );

        expect(onDateSelect).toHaveBeenCalledTimes(1);
        expect(
            isSameDay(onDateSelect.mock.calls[0][0] as DateTime, target),
        ).toBe(true);
    });

    it('shifts the window one week back with ‹ and one week forward with ›', () => {
        const onDateSelect = vi.fn();
        render(<AgendaDayStrip date={date} onDateSelect={onDateSelect} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'Semana anterior' }),
        );
        expect(
            isSameDay(
                onDateSelect.mock.calls[0][0] as DateTime,
                addDays(date, -7),
            ),
        ).toBe(true);

        fireEvent.click(
            screen.getByRole('button', { name: 'Semana siguiente' }),
        );
        expect(
            isSameDay(
                onDateSelect.mock.calls[1][0] as DateTime,
                addDays(date, 7),
            ),
        ).toBe(true);
    });

    it("marks today's button with aria-current=date, independent of the selected day", () => {
        const today = DateTime.now();
        render(
            <AgendaDayStrip
                date={addDays(today, today.weekday === 7 ? 1 : -1)}
                onDateSelect={vi.fn()}
            />,
        );

        const current = dayButtons().filter(
            (button) => button.getAttribute('aria-current') === 'date',
        );
        expect(current).toHaveLength(1);
        expect(current[0].textContent).toBe(expectedDayLabel(today));
        expect(current[0].getAttribute('aria-pressed')).toBe('false');
    });

    it('marks no day as today in a week that does not contain it', () => {
        render(<AgendaDayStrip date={date} onDateSelect={vi.fn()} />);

        expect(
            dayButtons().some((button) => button.hasAttribute('aria-current')),
        ).toBe(false);
    });
});
