import { render, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, it } from 'vitest';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { expectNoA11yViolations } from '../a11y';

// All these primitives render their open content through a React portal into
// `document.body`, not into the RTL `container` — auditing `document.body`
// (reset per test by `afterEach`'s `document.body.innerHTML = ''` in
// src/tests/setup.ts) is what actually reaches the portaled markup.

// axe-core's `region` rule expects all page content to sit inside a
// landmark (`<main>`, `<nav>`, etc.). It's a whole-page check: on a real
// page the dropdown/tooltip trigger lives inside PanelLayout's `<main>`, so
// it never fires there. Here the component is mounted in isolation with no
// surrounding page shell, so the rule has nothing to evaluate against and
// flags a false positive — unlike `role="dialog"`/`"alertdialog"`, which
// axe already treats as an exempt top-level container, `role="menu"` and a
// bare tooltip portal aren't.
const SKIP_REGION_OUTSIDE_PAGE_SHELL = [
    {
        id: 'region',
        reason: 'no surrounding <main>/<nav> landmark in an isolated component test',
    },
];

describe('overlays a11y (asserted open)', () => {
    it('dialog: an open dialog with a title and description has no violations', async () => {
        render(
            <Dialog open>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancelar turno</DialogTitle>
                        <DialogDescription>
                            Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>,
        );
        await expectNoA11yViolations(document.body);
    });

    it('alert-dialog: an open ConfirmDialog (title, description, cancel/confirm) has no violations', async () => {
        render(
            <ConfirmDialog
                open
                title="Eliminar especialidad"
                description="Esta acción no se puede deshacer."
                onConfirm={() => {}}
            />,
        );
        await expectNoA11yViolations(document.body);
    });

    it('sheet: an open sheet with a title and description has no violations', async () => {
        render(
            <Sheet open>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Detalle del turno</SheetTitle>
                        <SheetDescription>
                            Información completa del turno seleccionado.
                        </SheetDescription>
                    </SheetHeader>
                </SheetContent>
            </Sheet>,
        );
        await expectNoA11yViolations(document.body);
    });

    it('dropdown-menu: an open menu with real items has no violations', async () => {
        render(
            <DropdownMenu open>
                <DropdownMenuTrigger render={<Button>Abrir menú</Button>} />
                <DropdownMenuContent>
                    <DropdownMenuItem>Ajustes</DropdownMenuItem>
                    <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>,
        );
        await expectNoA11yViolations(document.body, {
            skip: SKIP_REGION_OUTSIDE_PAGE_SHELL,
        });
    });

    it('tooltip: an open tooltip on a real trigger has no violations', async () => {
        render(
            <TooltipProvider>
                <Tooltip open>
                    <TooltipTrigger render={<Button>Info</Button>} />
                    <TooltipContent>Texto de ayuda</TooltipContent>
                </Tooltip>
            </TooltipProvider>,
        );
        await expectNoA11yViolations(document.body, {
            skip: SKIP_REGION_OUTSIDE_PAGE_SHELL,
        });
    });

    it('sonner (toast): a rendered toast notification has no violations', async () => {
        render(<Toaster />);
        toast.success('Especialidad asignada');

        await waitFor(() => {
            if (!document.body.textContent?.includes('Especialidad asignada')) {
                throw new Error('toast not rendered yet');
            }
        });

        await expectNoA11yViolations(document.body);
    });
});
