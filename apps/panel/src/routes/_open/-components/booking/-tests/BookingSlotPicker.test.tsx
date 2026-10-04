import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingSlotPicker } from '../BookingSlotPicker';

const TIMEZONE = 'America/Argentina/Buenos_Aires';
// 02:00 UTC on Oct 5 is still Oct 4 in Buenos Aires, so the window must start on the 4th.
const NOW = new Date('2026-10-05T02:00:00Z');
const TODAY = '2026-10-04';
const LAST_DAY = '2026-12-03';

function renderPicker(date: string | undefined, slots = []) {
    const onDateChange = vi.fn();
    render(
        <BookingSlotPicker
            timezone={TIMEZONE}
            date={date}
            slots={slots}
            summary={null}
            onDateChange={onDateChange}
            onSlotSelect={() => {}}
            onBack={() => {}}
        />,
    );

    return onDateChange;
}

describe('BookingSlotPicker day navigation', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("bounds the date input by the practice's today and the 60-day window", () => {
        renderPicker(TODAY);

        const input = screen.getByLabelText('Día') as HTMLInputElement;
        expect(input.min).toBe(TODAY);
        expect(input.max).toBe(LAST_DAY);
    });

    it('shows the chosen day in long form and steps one day forward', () => {
        const onDateChange = renderPicker(TODAY);

        expect(screen.getByText('domingo, 4 de octubre')).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Día siguiente' }));

        expect(onDateChange).toHaveBeenCalledWith('2026-10-05');
    });

    it('disables going back before today and forward past the window', () => {
        renderPicker(TODAY);
        expect(
            (
                screen.getByRole('button', {
                    name: 'Día anterior',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });

    it('disables the next-day button on the last bookable day', () => {
        renderPicker(LAST_DAY);

        expect(
            (
                screen.getByRole('button', {
                    name: 'Día siguiente',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });

    it("offers 'Ver el día siguiente' on a day with no slots", () => {
        const onDateChange = renderPicker('2026-10-10');

        expect(
            screen.getByText('No hay horarios disponibles para este día.'),
        ).not.toBeNull();
        fireEvent.click(
            screen.getByRole('button', { name: 'Ver el día siguiente' }),
        );

        expect(onDateChange).toHaveBeenCalledWith('2026-10-11');
    });

    it("hides 'Ver el día siguiente' on the last bookable day", () => {
        renderPicker(LAST_DAY);

        expect(
            screen.queryByRole('button', { name: 'Ver el día siguiente' }),
        ).toBeNull();
    });
});
