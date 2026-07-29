import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogMedia,
} from '@/components/ui/alert-dialog';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
