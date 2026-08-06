import { zodResolver } from '@hookform/resolvers/zod';
import { render } from '@testing-library/react';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { describe, it } from 'vitest';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { expectNoA11yViolations } from '../a11y';

describe('forms a11y', () => {
    it('button: an icon-less action button has no violations', async () => {
        const { container } = render(<Button>Guardar</Button>);
        await expectNoA11yViolations(container);
    });

    it('input + label: an id/htmlFor-associated text field has no violations', async () => {
        function Field() {
            const id = useId();
            return (
                <div>
                    <Label htmlFor={id}>Nombre</Label>
                    <Input id={id} name="name" />
                </div>
            );
        }
        const { container } = render(<Field />);
        await expectNoA11yViolations(container);
    });

    it('select: a labelled trigger with a real item list has no violations', async () => {
        function Field() {
            const id = useId();
            return (
                <div>
                    <Label htmlFor={id}>Profesional</Label>
                    <Select
                        items={[{ value: '1', label: 'Dra. Ana López' }]}
                        defaultValue="1"
                    >
                        <SelectTrigger id={id}>
                            <SelectValue placeholder="Seleccioná un profesional" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Dra. Ana López</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            );
        }
        const { container } = render(<Field />);
        await expectNoA11yViolations(container);
    });

    it('checkbox: an id/htmlFor-associated checkbox has no violations', async () => {
        function Field() {
            const id = useId();
            return (
                <div>
                    <Checkbox id={id} />
                    <Label htmlFor={id}>Servicio asignado</Label>
                </div>
            );
        }
        const { container } = render(<Field />);
        await expectNoA11yViolations(container);
    });

    it('radio-group: each option nested in its own native label has no violations', async () => {
        const options = [
            { value: 'dni', label: 'DNI' },
            { value: 'passport', label: 'Pasaporte' },
        ];
        function Field() {
            return (
                <RadioGroup defaultValue="dni">
                    {options.map((option) => (
                        <label
                            key={option.value}
                            className="flex items-center gap-2 text-sm"
                        >
                            <RadioGroupItem value={option.value} />
                            {option.label}
                        </label>
                    ))}
                </RadioGroup>
            );
        }
        const { container } = render(<Field />);
        await expectNoA11yViolations(container);
    });

    it('switch: an id/htmlFor-associated switch has no violations', async () => {
        function Field() {
            const id = useId();
            return (
                <div>
                    <Switch id={id} defaultChecked />
                    <Label htmlFor={id}>Profesional activo</Label>
                </div>
            );
        }
        const { container } = render(<Field />);
        await expectNoA11yViolations(container);
    });

    it('form: a full Form/FormField/FormLabel/FormControl/FormMessage composition has no violations', async () => {
        const schema = z.object({
            value: z.string().min(1, 'Este campo es obligatorio.'),
        });
        type Values = z.infer<typeof schema>;

        function TestForm() {
            const form = useForm<Values>({
                resolver: zodResolver(schema),
                defaultValues: { value: 'Consulta general' },
            });

            return (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(() => {})}>
                        <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Servicio</FormLabel>
                                    <FormControl
                                        render={<Input {...field} />}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Enviar</Button>
                    </form>
                </Form>
            );
        }

        const { container } = render(<TestForm />);
        await expectNoA11yViolations(container);
    });
});
