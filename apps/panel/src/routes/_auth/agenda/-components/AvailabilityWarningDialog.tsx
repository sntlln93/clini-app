import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AvailabilityWarningDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    confirmLabel?: string;
};

// Client-side UX warning only — the backend never rejects a booking outside declared availability.
export function AvailabilityWarningDialog({
    open,
    onOpenChange,
    onConfirm,
    confirmLabel = 'Registrar de todos modos',
}: AvailabilityWarningDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Turno fuera de horario</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Querés registrar el turno fuera del horario disponible
                        del profesional?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
