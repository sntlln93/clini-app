import { stubElementFromPoint } from '@/tests/input-otp';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TwoFactorCodeInput } from './TwoFactorCodeInput';

function Field() {
    const [value, setValue] = useState('');

    return (
        <>
            <label htmlFor="code">Código de verificación</label>
            <TwoFactorCodeInput id="code" value={value} onChange={setValue} />
        </>
    );
}

stubElementFromPoint();

describe('TwoFactorCodeInput', () => {
    it('shows six slots in two groups of three with a separator between them', () => {
        const { container } = render(<Field />);

        const groups = container.querySelectorAll(
            '[data-slot="input-otp-group"]',
        );
        expect(groups).toHaveLength(2);
        groups.forEach((group) =>
            expect(
                group.querySelectorAll('[data-slot="input-otp-slot"]'),
            ).toHaveLength(3),
        );
        expect(screen.getByRole('separator')).toBeTruthy();
    });

    it('is one labelled field that takes digits and asks for the one-time code', () => {
        render(<Field />);
        const input = screen.getByLabelText(
            'Código de verificación',
        ) as HTMLInputElement;

        expect(input.getAttribute('autocomplete')).toBe('one-time-code');
        expect(input.getAttribute('inputmode')).toBe('numeric');
        expect(input.maxLength).toBe(6);

        fireEvent.change(input, { target: { value: '123456' } });
        expect(input.value).toBe('123456');
        expect(screen.getByText('1')).toBeTruthy();
        expect(screen.getByText('6')).toBeTruthy();
    });

    it('drops anything that is not a digit', () => {
        render(<Field />);
        const input = screen.getByLabelText(
            'Código de verificación',
        ) as HTMLInputElement;

        fireEvent.change(input, { target: { value: '12a' } });

        expect(input.value).toBe('');
    });

    it('takes a pasted code copied with a space in the middle', () => {
        render(<Field />);
        const input = screen.getByLabelText(
            'Código de verificación',
        ) as HTMLInputElement;

        fireEvent.paste(input, {
            clipboardData: { getData: () => '123 456' },
        });

        expect(input.value).toBe('123456');
    });
});
