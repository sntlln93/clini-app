import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ReasonDialog } from '@/features/reason-dialog/ReasonDialog';
import type { Appointment } from '@/types/appointment';
import type { ClinicalNote } from '@/types/clinical-note';
import { useAnnulClinicalNote } from '../-hooks/use-clinical-notes';

type ClinicalNoteActionsProps = {
    appointment: Appointment | null;
    note: ClinicalNote;
    onAmend: () => void;
};

// A note is never edited or deleted (#323): its author amends it, keeping the
// earlier text, or annuls it with a reason, keeping it marked as void.
export function ClinicalNoteActions({
    appointment,
    note,
    onAmend,
}: ClinicalNoteActionsProps) {
    const annul = useAnnulClinicalNote(appointment);
    const [annulling, setAnnulling] = useState(false);

    return (
        <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={onAmend}>
                Enmendar
            </Button>
            <ReasonDialog
                trigger={
                    <Button type="button" size="sm" variant="ghost">
                        Anular
                    </Button>
                }
                open={annulling}
                onOpenChange={setAnnulling}
                title="Anular nota"
                description="La nota queda en la historia clínica, marcada como anulada junto con el motivo. No se puede deshacer."
                submitLabel="Anular nota"
                onSubmit={(reason) =>
                    annul.mutateAsync({ id: note.id, reason })
                }
            />
        </div>
    );
}
