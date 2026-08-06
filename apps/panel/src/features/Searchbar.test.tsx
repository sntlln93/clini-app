import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SEARCH_DEBOUNCE_MS, Searchbar } from './Searchbar';

describe('Searchbar', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('reflects each keystroke immediately but only calls onSearch once the debounce elapses', async () => {
        const onSearch = vi.fn();
        render(<Searchbar value="" onSearch={onSearch} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        vi.useFakeTimers();
        fireEvent.change(input, { target: { value: 'ana' } });

        expect(input.value).toBe('ana');
        expect(onSearch).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);
        expect(onSearch).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith('ana');
    });

    it('collapses successive keystrokes within the debounce window into a single call with the last value', async () => {
        const onSearch = vi.fn();
        render(<Searchbar value="" onSearch={onSearch} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        vi.useFakeTimers();
        fireEvent.change(input, { target: { value: 'a' } });
        await vi.advanceTimersByTimeAsync(100);
        fireEvent.change(input, { target: { value: 'an' } });
        await vi.advanceTimersByTimeAsync(100);
        fireEvent.change(input, { target: { value: 'ana' } });

        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith('ana');
    });

    it('reflects an external value change (clear button / browser back) in the input', () => {
        const onSearch = vi.fn();
        const { rerender } = render(
            <Searchbar value="ana" onSearch={onSearch} />,
        );
        expect(screen.getByDisplayValue('ana')).not.toBeNull();

        rerender(<Searchbar value="" onSearch={onSearch} />);

        expect(screen.getByDisplayValue('')).not.toBeNull();
    });

    it('an external value change cancels a pending debounce, so a stale keystroke never fires', async () => {
        const onSearch = vi.fn();
        const { rerender } = render(<Searchbar value="" onSearch={onSearch} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        vi.useFakeTimers();
        fireEvent.change(input, { target: { value: 'ana' } });
        await vi.advanceTimersByTimeAsync(100);

        // An external `value` change (e.g. browser back) arrives before the
        // pending debounce settles.
        rerender(<Searchbar value="other" onSearch={onSearch} />);

        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

        expect(onSearch).not.toHaveBeenCalled();
    });

    it("uses the label as the input's accessible name when provided", () => {
        const onSearch = vi.fn();
        render(
            <Searchbar
                value=""
                onSearch={onSearch}
                label="Buscar pacientes"
                placeholder="Buscar por nombre o documento…"
            />,
        );

        expect(
            screen.getByRole('textbox', { name: 'Buscar pacientes' }),
        ).not.toBeNull();
    });

    it('falls back to the placeholder as the accessible name when no label is passed', () => {
        const onSearch = vi.fn();
        render(
            <Searchbar
                value=""
                onSearch={onSearch}
                placeholder="Buscar por nombre o email…"
            />,
        );

        expect(
            screen.getByRole('textbox', {
                name: 'Buscar por nombre o email…',
            }),
        ).not.toBeNull();
    });

    it("falls back to 'Buscar' as the accessible name when neither label nor placeholder is passed", () => {
        const onSearch = vi.fn();
        render(<Searchbar value="" onSearch={onSearch} />);

        expect(screen.getByRole('textbox', { name: 'Buscar' })).not.toBeNull();
    });

    it('renders two Searchbars on the same page with independent inputs', () => {
        const onSearch = vi.fn();
        render(
            <>
                <Searchbar value="" onSearch={onSearch} label="Buscar A" />
                <Searchbar value="" onSearch={onSearch} label="Buscar B" />
            </>,
        );

        const inputA = screen.getByLabelText('Buscar A');
        const inputB = screen.getByLabelText('Buscar B');

        expect(inputA).not.toBe(inputB);
        expect(inputA.id).not.toBe(inputB.id);
    });
});
