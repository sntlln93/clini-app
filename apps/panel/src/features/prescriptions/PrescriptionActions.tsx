import { Button } from '@/components/ui/button';

type PrescriptionActionsProps = {
    onAmend: () => void;
    onAnnul: () => void;
};

// A record is never edited or deleted (#323): its author amends it, keeping
// the earlier items, or annuls it with a reason, keeping it marked as no
// longer valid (#344).
export function PrescriptionActions({
    onAmend,
    onAnnul,
}: PrescriptionActionsProps) {
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
