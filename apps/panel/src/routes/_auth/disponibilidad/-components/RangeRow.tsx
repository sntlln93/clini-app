import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
    rangeOf,
    useRangeFields,
    type RangeValues,
} from '../-hooks/use-range-fields';
import { RangeInputs } from './RangeInputs';
import { formatRange, type Range } from './week-draft';

type RangeRowProps = {
    range: Range;
    canManage: boolean;
    onCommit: (range: Range) => void;
    onRemove: () => void;
};

/** One range of the day panel; a valid edit reaches the draft when the input is left. */
export function RangeRow({
    range,
    canManage,
    onCommit,
    onRemove,
}: RangeRowProps) {
    const fields = useRangeFields(range);

    // Takes the inputs' final values: the one just left may not have reached
    // the hook's state yet when its blur commits.
    function commit(values: RangeValues) {
        const parsed = rangeOf(values);
        if (
            parsed !== null &&
            (parsed.start !== range.start || parsed.end !== range.end)
        ) {
            onCommit(parsed);
        }
    }

    return (
        <li className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
                <RangeInputs
                    values={fields.values}
                    error={fields.error}
                    disabled={!canManage}
                    onStartChange={fields.setStart}
                    onEndChange={fields.setEnd}
                    onCommit={commit}
                />
            </div>
            {canManage && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-5"
                    aria-label={`Eliminar franja de ${formatRange(range)}`}
                    onClick={onRemove}
                >
                    <Trash2 aria-hidden />
                </Button>
            )}
        </li>
    );
}
