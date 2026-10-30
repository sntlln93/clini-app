import { Button } from '@/components/ui/button';
import { CATEGORY_SECTIONS } from '@/lib/medical-history';
import type {
    MedicalHistoryCategory,
    MedicalHistoryEntry,
} from '@/types/medical-history';
import { MedicalHistoryEntryItem } from './MedicalHistoryEntryItem';
import { RecordActions } from './RecordActions';

type MedicalHistorySectionProps = {
    category: MedicalHistoryCategory;
    // Current ones first (`entriesOf`).
    entries: MedicalHistoryEntry[];
    // Null when nothing can be recorded now.
    onRecord: (() => void) | null;
    canChange: (entry: MedicalHistoryEntry) => boolean;
    onAmend: (entry: MedicalHistoryEntry) => void;
    onWithdraw: (entry: MedicalHistoryEntry) => void;
};

// The allergies, or one kind of antecedent, of the patient (#361).
export function MedicalHistorySection({
    category,
    entries,
    onRecord,
    canChange,
    onAmend,
    onWithdraw,
}: MedicalHistorySectionProps) {
    const titleId = `medical-history-${category}`;

    return (
        <section aria-labelledby={titleId} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={titleId} className="text-sm font-medium">
                    {CATEGORY_SECTIONS[category]}
                </h3>
                {onRecord && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={onRecord}
                    >
                        Agregar
                    </Button>
                )}
            </div>
            {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin registrar.</p>
            ) : (
                <ul className="space-y-2">
                    {entries.map((entry) => (
                        <MedicalHistoryEntryItem
                            key={entry.id}
                            entry={entry}
                            actions={
                                canChange(entry) &&
                                entry.withdrawal === null && (
                                    <RecordActions
                                        endLabel="Dar de baja"
                                        onAmend={() => onAmend(entry)}
                                        onEnd={() => onWithdraw(entry)}
                                    />
                                )
                            }
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}
