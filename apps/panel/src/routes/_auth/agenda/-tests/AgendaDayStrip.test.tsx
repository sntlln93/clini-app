import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgendaDayStrip } from '../-components/AgendaDayStrip';

const DAY_ABBREVIATION_FORMAT = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
});

function expectedDayLabel(day: Date): string {
    return `${DAY_ABBREVIATION_FORMAT.format(day).replace('.', '')} ${day.getDate()}`;
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function startOfWeek(date: Date): Date {
    return addDays(date, -date.getDay());
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function dayButtons(): HTMLElement[] {
    return screen
        .getAllByRole('button')
        .filter((button) => button.hasAttribute('aria-pressed'));
}

describe('AgendaDayStrip', () => {
    // A Wednesday, so the week it belongs to runs Sunday–Saturday around it.
    const date = new Date(2026, 7, 5);

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
        expect(isSameDay(onDateSelect.mock.calls[0][0] as Date, target)).toBe(
            true,
        );
    });

    it('shifts the window one week back with ‹ and one week forward with ›', () => {
        const onDateSelect = vi.fn();
        render(<AgendaDayStrip date={date} onDateSelect={onDateSelect} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'Semana anterior' }),
        );
        expect(
            isSameDay(onDateSelect.mock.calls[0][0] as Date, addDays(date, -7)),
        ).toBe(true);

        fireEvent.click(
            screen.getByRole('button', { name: 'Semana siguiente' }),
        );
        expect(
            isSameDay(onDateSelect.mock.calls[1][0] as Date, addDays(date, 7)),
        ).toBe(true);
    });
});
