import { Button } from '@/components/ui/button';

type RecordActionsProps = {
    onAmend: () => void;
    onEnd: () => void;
    // «Anular» for a measurement, «Dar de baja» for a background entry.
    endLabel: string;
};

// A clinical record is never edited or deleted (ADR 0019): its author amends
// it, keeping the earlier versions, or ends it, keeping it marked.
export function RecordActions({
    onAmend,
    onEnd,
    endLabel,
}: RecordActionsProps) {
    return (
        <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={onAmend}>
                Enmendar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onEnd}>
                {endLabel}
            </Button>
        </div>
    );
}
