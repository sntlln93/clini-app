import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type SaveBarProps = {
    canManage: boolean;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    onDiscard: () => void;
};

/** Saves or drops the draft; sticks to the bottom of the screen on mobile. */
export function SaveBar({
    canManage,
    isDirty,
    isSaving,
    onSave,
    onDiscard,
}: SaveBarProps) {
    return (
        <div className="z-10 flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-card max-lg:sticky max-lg:bottom-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
                Estos horarios se repiten cada semana. Los turnos ya agendados
                no se modifican.
            </p>
            {canManage && (
                <div className="flex shrink-0 flex-wrap gap-2 max-sm:*:flex-1">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!isDirty || isSaving}
                        onClick={onDiscard}
                    >
                        Descartar
                    </Button>
                    <Button
                        type="button"
                        disabled={!isDirty || isSaving}
                        onClick={onSave}
                    >
                        {isSaving && (
                            <Spinner data-icon="inline-start" aria-hidden />
                        )}
                        Guardar cambios
                    </Button>
                </div>
            )}
        </div>
    );
}
