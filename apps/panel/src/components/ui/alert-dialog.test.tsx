import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogMedia,
} from '@/components/ui/alert-dialog';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('AlertDialogContent size', () => {
    it('defaults to data-size="default" without a size prop', () => {
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
        expect(content?.getAttribute('data-size')).toBe('default');
    });

    it('renders data-size="sm" when size="sm" is passed', () => {
        render(
            <AlertDialog open>
                <AlertDialogContent size="sm" aria-describedby={undefined}>
                    Contenido
                </AlertDialogContent>
            </AlertDialog>,
        );

        const content = document.querySelector(
            '[data-slot="alert-dialog-content"]',
        );
        expect(content?.getAttribute('data-size')).toBe('sm');
    });

    it('merges the caller className with the recipe className instead of replacing it', () => {
        render(
            <AlertDialog open>
                <AlertDialogContent
                    className="custom-x"
                    aria-describedby={undefined}
                >
                    Contenido
                </AlertDialogContent>
            </AlertDialog>,
        );

        const content = document.querySelector(
            '[data-slot="alert-dialog-content"]',
        );
        const classes = content?.className.split(' ') ?? [];
        expect(classes).toContain('custom-x');
        expect(classes).toContain('focus-ring');
    });
});

describe('AlertDialogMedia', () => {
    it('renders a data-slot="alert-dialog-media" element and keeps the caller className', () => {
        render(
            <AlertDialogMedia className="custom-media">Icono</AlertDialogMedia>,
        );

        const media = document.querySelector(
            '[data-slot="alert-dialog-media"]',
        );
        expect(media).not.toBeNull();
        expect(media?.className.split(' ')).toContain('custom-media');
    });
});

describe('AlertDialogAction', () => {
    it('defaults to the Button default variant when no variant is passed', () => {
        render(
            <AlertDialog open>
                <AlertDialogContent aria-describedby={undefined}>
                    <AlertDialogAction>Confirmar</AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>,
        );

        const action = document.querySelector(
            '[data-slot="alert-dialog-action"]',
        );
        expect(action?.className.split(' ')).toContain('bg-primary');
    });

    it('renders the destructive variant classes and not the default variant classes', () => {
        render(
            <AlertDialog open>
                <AlertDialogContent aria-describedby={undefined}>
                    <AlertDialogAction variant="destructive">
                        Eliminar
                    </AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>,
        );

        const action = document.querySelector(
            '[data-slot="alert-dialog-action"]',
        );
        const classes = action?.className.split(' ') ?? [];
        expect(classes).toContain('text-destructive');
        expect(classes).not.toContain('bg-primary');
    });

    it('renders the sm size classes when size="sm" is passed', () => {
        render(
            <AlertDialog open>
                <AlertDialogContent aria-describedby={undefined}>
                    <AlertDialogAction size="sm">Confirmar</AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>,
        );

        const action = document.querySelector(
            '[data-slot="alert-dialog-action"]',
        );
        expect(action?.className.split(' ')).toContain('h-7');
    });

    it('merges the caller className with the recipe className instead of replacing it', () => {
        render(
            <AlertDialog open>
                <AlertDialogContent aria-describedby={undefined}>
                    <AlertDialogAction className="custom-action">
                        Confirmar
                    </AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>,
        );

        const action = document.querySelector(
            '[data-slot="alert-dialog-action"]',
        );
        const classes = action?.className.split(' ') ?? [];
        expect(classes).toContain('custom-action');
        expect(classes).toContain('bg-primary');
    });

    it('closes the dialog when clicked', () => {
        const onOpenChange = vi.fn();
        render(
            <AlertDialog open onOpenChange={onOpenChange}>
                <AlertDialogContent aria-describedby={undefined}>
                    <AlertDialogAction>Confirmar</AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>,
        );

        const action = document.querySelector(
            '[data-slot="alert-dialog-action"]',
        );
        fireEvent.click(action as Element);

        expect(onOpenChange).toHaveBeenCalled();
        expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
    });
});

describe('AlertDialogCancel', () => {
    it('defaults to the outline variant when no variant is passed', () => {
        render(
            <AlertDialog open>
                <AlertDialogContent aria-describedby={undefined}>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                </AlertDialogContent>
            </AlertDialog>,
        );

        const cancel = document.querySelector(
            '[data-slot="alert-dialog-cancel"]',
        );
        expect(cancel?.className.split(' ')).toContain('border-border');
    });

    it('closes the dialog when clicked', () => {
        const onOpenChange = vi.fn();
        render(
            <AlertDialog open onOpenChange={onOpenChange}>
                <AlertDialogContent aria-describedby={undefined}>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                </AlertDialogContent>
            </AlertDialog>,
        );

        const cancel = document.querySelector(
            '[data-slot="alert-dialog-cancel"]',
        );
        fireEvent.click(cancel as Element);

        expect(onOpenChange).toHaveBeenCalled();
        expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
    });
});
