import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useId } from 'react';

type MemberDangerZoneProps = {
    isDeactivating: boolean;
    errorMessage: string | null;
    onConfirmDeactivate: () => void;
};

/** Kept apart from the form's save/cancel row so the destructive action is never the one next to "Guardar cambios". */
export function MemberDangerZone({
    isDeactivating,
    errorMessage,
    onConfirmDeactivate,
}: MemberDangerZoneProps) {
    const headingId = useId();

    return (
        <section
            aria-labelledby={headingId}
            className="max-w-xl space-y-3 rounded-md border border-destructive/50 p-4"
        >
            <div className="space-y-1">
                <h2
                    id={headingId}
                    className="text-sm font-medium text-destructive"
                >
                    Zona de peligro
                </h2>
                <p className="text-sm text-muted-foreground">
                    Al dar de baja a este miembro pierde el acceso a la
                    organización y deja de figurar en el equipo.
                </p>
            </div>

            {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <ConfirmDialog
                trigger={
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={isDeactivating}
                    >
                        {isDeactivating ? 'Dando de baja…' : 'Dar de baja'}
                    </Button>
                }
                title="Dar de baja a este miembro"
                description="Pierde el acceso a la organización y deja de figurar en el equipo. Esta acción no se puede deshacer."
                confirmLabel="Dar de baja"
                onConfirm={onConfirmDeactivate}
                isPending={isDeactivating}
            />
        </section>
    );
}
