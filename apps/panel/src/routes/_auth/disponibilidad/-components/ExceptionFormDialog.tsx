import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query';
import type { AvailabilityException } from '@/types/availability';
import { AvailabilityExceptionForm } from './AvailabilityExceptionForm';

/** What the dialog is open for: a new exception, or the one being edited. */
export type ExceptionEditing = { exception?: AvailabilityException } | null;

type ExceptionFormDialogProps = {
    editing: ExceptionEditing;
    membershipId: number;
    canManageOrgWide: boolean;
    onClose: () => void;
};

const DESCRIPTION =
    'Cambia la semana habitual solo en esas fechas; al terminar, vuelve a regir.';

/** The exception form, in a dialog on desktop and a bottom sheet below `lg`. */
export function ExceptionFormDialog({
    editing,
    membershipId,
    canManageOrgWide,
    onClose,
}: ExceptionFormDialogProps) {
    const isDesktop = useMediaQuery(DESKTOP_QUERY);
    const open = editing !== null;
    const title = editing?.exception ? 'Editar excepción' : 'Nueva excepción';
    const form = editing && (
        <AvailabilityExceptionForm
            key={editing.exception?.id ?? 'new'}
            membershipId={membershipId}
            canManageOrgWide={canManageOrgWide}
            exception={editing.exception}
            onDone={onClose}
        />
    );
    const onOpenChange = (next: boolean) => !next && onClose();

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{DESCRIPTION}</DialogDescription>
                    </DialogHeader>
                    {form}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="max-h-[90dvh] overflow-y-auto rounded-t-3xl pb-4"
            >
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>{DESCRIPTION}</SheetDescription>
                </SheetHeader>
                <div className="px-4">{form}</div>
            </SheetContent>
        </Sheet>
    );
}
