import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('focus-visible treatment', () => {
    it('applies focus-ring to a bare DropdownMenuTrigger', () => {
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Abrir</DropdownMenuTrigger>
            </DropdownMenu>,
        );

        const trigger = screen.getByText('Abrir');
        expect(trigger.className.split(' ')).toContain('focus-ring');
    });

    it('does not add a second focus-ring to a DropdownMenuTrigger composed via render', () => {
        // Button's own recipe already carries `focus-ring` unconditionally, so
        // the composed element still shows the class — it must come from
        // Button alone, not be duplicated by DropdownMenuTrigger on top of it.
        render(<Button>Solo</Button>);
        const bareButtonOccurrences = screen
            .getByText('Solo')
            .className.split(' ')
            .filter((c) => c === 'focus-ring').length;

        render(
            <DropdownMenu>
                <DropdownMenuTrigger render={<Button />}>
                    Abrir
                </DropdownMenuTrigger>
            </DropdownMenu>,
        );

        const composedOccurrences = screen
            .getByText('Abrir')
            .className.split(' ')
            .filter((c) => c === 'focus-ring').length;
        expect(composedOccurrences).toBe(bareButtonOccurrences);
    });

    it('keeps both focus-ring and the caller className on a bare trigger', () => {
        render(
            <DropdownMenu>
                <DropdownMenuTrigger className="custom-x">
                    Abrir
                </DropdownMenuTrigger>
            </DropdownMenu>,
        );

        const trigger = screen.getByText('Abrir');
        const classes = trigger.className.split(' ');
        expect(classes).toContain('focus-ring');
        expect(classes).toContain('custom-x');
    });

    it('keeps both focus-ring and a function-valued className on a bare trigger', () => {
        render(
            <DropdownMenu>
                <DropdownMenuTrigger className={() => 'custom-fn'}>
                    Abrir
                </DropdownMenuTrigger>
            </DropdownMenu>,
        );

        const trigger = screen.getByText('Abrir');
        const classes = trigger.className.split(' ');
        expect(classes).toContain('focus-ring');
        expect(classes).toContain('custom-fn');
    });

    it('applies focus-ring to DialogContent', () => {
        render(
            <Dialog open>
                <DialogContent aria-describedby={undefined}>
                    Contenido
                </DialogContent>
            </Dialog>,
        );

        const content = document.querySelector('[data-slot="dialog-content"]');
        expect(content?.className.split(' ')).toContain('focus-ring');
    });

    it('applies focus-ring to SheetContent', () => {
        render(
            <Sheet open>
                <SheetContent aria-describedby={undefined}>
                    Contenido
                </SheetContent>
            </Sheet>,
        );

        const content = document.querySelector('[data-slot="sheet-content"]');
        expect(content?.className.split(' ')).toContain('focus-ring');
    });

    it('applies focus-ring to AlertDialogContent', () => {
        render(
            <AlertDialog open>
                <AlertDialogContent aria-describedby={undefined}>
                    Contenido
                </AlertDialogContent>
            </AlertDialog>,
        );

        const content = document.querySelector(
            '[data-slot="alert-dialog-content"]',
        );
        expect(content?.className.split(' ')).toContain('focus-ring');
    });

    it('applies focus-ring to Button and Badge', () => {
        render(
            <>
                <Button>Guardar</Button>
                <Badge>Nuevo</Badge>
            </>,
        );

        expect(screen.getByText('Guardar').className.split(' ')).toContain(
            'focus-ring',
        );
        expect(screen.getByText('Nuevo').className.split(' ')).toContain(
            'focus-ring',
        );
    });

    it('applies focus-ring to Input, Checkbox and Switch', () => {
        render(
            <>
                <Input aria-label="input-de-prueba" />
                <Checkbox aria-label="checkbox-de-prueba" />
                <Switch aria-label="switch-de-prueba" />
            </>,
        );

        expect(
            screen.getByLabelText('input-de-prueba').className.split(' '),
        ).toContain('focus-ring');
        expect(
            screen.getByLabelText('checkbox-de-prueba').className.split(' '),
        ).toContain('focus-ring');
        expect(
            screen.getByLabelText('switch-de-prueba').className.split(' '),
        ).toContain('focus-ring');
    });
});
