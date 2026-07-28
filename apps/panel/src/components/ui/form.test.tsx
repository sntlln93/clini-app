import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from './form';
import { Input } from './input';

const schema = z.object({
    value: z.string().min(1, 'Este campo es obligatorio.'),
});

type Values = z.infer<typeof schema>;

function TestForm() {
    const form = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { value: '' },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(() => {})}>
                <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Campo</FormLabel>
                            <FormControl render={<Input {...field} />} />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <button type="submit">Enviar</button>
            </form>
        </Form>
    );
}

describe('Form primitive accessibility contract', () => {
    it('wires aria-invalid, aria-describedby and label/control ids once the field errors', async () => {
        render(<TestForm />);

        const input = screen.getByLabelText('Campo');
        expect(input.getAttribute('aria-invalid')).toBe('false');

        fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

        const message = await screen.findByText('Este campo es obligatorio.');

        expect(input.getAttribute('aria-invalid')).toBe('true');

        const describedBy = input.getAttribute('aria-describedby') ?? '';
        expect(describedBy.split(' ')).toContain(message.id);

        const label = screen.getByText('Campo');
        expect(label.getAttribute('for')).toBe(input.getAttribute('id'));
    });
});
