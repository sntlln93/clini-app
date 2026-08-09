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

// These primitives portal their open content into `document.body`, not the
// RTL `container`, so the audit targets `document.body`, which
// src/tests/setup.ts's `afterEach` resets per test.

// axe's `region` rule is a whole-page check expecting content inside a
// landmark; it's a false positive here since the component is mounted in
// isolation with no page shell (on a real page the trigger sits inside
// PanelLayout's `<main>`).
// axe already exempts `role="dialog"`/`"alertdialog"` as top-level
// containers, but `role="menu"` and a bare tooltip portal aren't, hence the
// skip is needed only for those.
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
