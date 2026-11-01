import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useBlocker } from '@tanstack/react-router';

/**
 * Asks before leaving the page, switching professional or sub-page, or closing the
 * window while `when` holds; confirming drops the unsaved changes.
 */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
    const blocker = useBlocker({
        shouldBlockFn: () => when,
        enableBeforeUnload: () => when,
        withResolver: true,
    });

    return (
        <ConfirmDialog
            open={blocker.status === 'blocked'}
            onOpenChange={(open) => !open && blocker.reset?.()}
            title="Hay cambios sin guardar"
            description="Si seguís, se pierden los cambios que hiciste en la semana habitual."
            confirmLabel="Descartar cambios"
            cancelLabel="Seguir editando"
            onConfirm={() => blocker.proceed?.()}
        />
    );
}
