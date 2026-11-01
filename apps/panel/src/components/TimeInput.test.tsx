import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TimeInput } from './TimeInput';

function valueOf(element: HTMLElement): string {
    return (element as HTMLInputElement).value;
}

function Harness({
    initial = '',
    onChange = () => {},
    onCommit,
}: {
    initial?: string;
    onChange?: (value: string) => void;
    onCommit?: (value: string) => void;
}) {
    const [value, setValue] = useState(initial);

    return (
        <>
            <label htmlFor="hora">Hora</label>
            <TimeInput
                id="hora"
                value={value}
                onChange={(next) => {
                    setValue(next);
                    onChange(next);
                }}
                onCommit={onCommit}
            />
            <output>{value}</output>
        </>
    );
}

describe('TimeInput', () => {
    it('is a text field with no AM/PM, asking for digits', () => {
        render(<Harness initial="09:00" />);

        const input = screen.getByLabelText('Hora');
        expect(input.getAttribute('type')).toBe('text');
        expect(input.getAttribute('inputmode')).toBe('numeric');
        expect(valueOf(input)).toBe('09:00');
    });

    it('reports a time only once it is complete', () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);

        const input = screen.getByLabelText('Hora');
        fireEvent.change(input, { target: { value: '173' } });
        expect(onChange).not.toHaveBeenCalled();
        expect(valueOf(input)).toBe('17:3');

        fireEvent.change(input, { target: { value: '1730' } });
        expect(onChange).toHaveBeenLastCalledWith('17:30');
        expect(valueOf(input)).toBe('17:30');
    });

    it('completes a bare hour on leaving and commits it', () => {
        const onCommit = vi.fn();
        render(<Harness onCommit={onCommit} />);

        const input = screen.getByLabelText('Hora');
        fireEvent.change(input, { target: { value: '9' } });
        fireEvent.blur(input);

        expect(valueOf(input)).toBe('09:00');
        expect(screen.getByRole('status').textContent).toBe('09:00');
        expect(onCommit).toHaveBeenCalledWith('09:00');
    });

    it('reports an empty value when left with something that is not a time', () => {
        const onChange = vi.fn();
        render(<Harness initial="09:00" onChange={onChange} />);

        const input = screen.getByLabelText('Hora');
        fireEvent.change(input, { target: { value: '25' } });
        fireEvent.blur(input);

        expect(onChange).toHaveBeenLastCalledWith('');
        expect(valueOf(input)).toBe('25');
    });

    it('steps by its minutes with the arrow keys', () => {
        render(<Harness initial="09:00" />);

        const input = screen.getByLabelText('Hora');
        for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown']) {
            fireEvent.keyDown(input, { key });
        }

        expect(valueOf(input)).toBe('09:15');
        expect(screen.getByRole('status').textContent).toBe('09:15');
    });

    it('follows a value set from outside', () => {
        const { rerender } = render(
            <TimeInput aria-label="Hora" value="09:00" onChange={() => {}} />,
        );

        rerender(
            <TimeInput aria-label="Hora" value="10:30" onChange={() => {}} />,
        );

        expect(valueOf(screen.getByLabelText('Hora'))).toBe('10:30');
    });
});
