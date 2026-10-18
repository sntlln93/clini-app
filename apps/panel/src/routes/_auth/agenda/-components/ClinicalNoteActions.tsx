import { Button } from '@/components/ui/button';

type ClinicalNoteActionsProps = {
    onAmend: () => void;
    onAnnul: () => void;
};

// A note is never edited or deleted (#323): its author amends it, keeping the
// earlier text, or annuls it with a reason, keeping it marked as void.
export function ClinicalNoteActions({
    onAmend,
    onAnnul,
}: ClinicalNoteActionsProps) {
    return (
        <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={onAmend}>
                Enmendar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onAnnul}>
                Anular
            </Button>
        </div>
    );
}
