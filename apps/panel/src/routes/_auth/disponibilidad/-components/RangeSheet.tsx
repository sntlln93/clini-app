import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useRangeFields } from '../-hooks/use-range-fields';
import { RangeInputs } from './RangeInputs';
import { formatDuration, type Range } from './week-draft';
import { DAY_NAMES } from './week-labels';

export type SheetTarget = { day: number; index: number | null; range: Range };

type RangeSheetProps = {
    target: SheetTarget | null;
    onClose: () => void;
    onApply: (target: SheetTarget, range: Range) => void;
    onRemove: (target: SheetTarget) => void;
};

function RangeForm({
    target,
    onApply,
    onRemove,
}: Omit<RangeSheetProps, 'onClose' | 'target'> & { target: SheetTarget }) {
    const fields = useRangeFields(target.range);

    function submit(event: FormEvent) {
        event.preventDefault();
        if (fields.parsed) {
            onApply(target, fields.parsed);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-4 px-4">
            <RangeInputs
                values={fields.values}
                error={fields.error}
                onStartChange={fields.setStart}
                onEndChange={fields.setEnd}
            />
            {fields.parsed && (
                <p className="text-center text-sm text-muted-foreground">
                    {formatDuration(fields.parsed.end - fields.parsed.start)} de
                    atención
                </p>
            )}
            <SheetFooter className="px-0">
                <Button type="submit" size="lg" disabled={!fields.parsed}>
                    Aplicar
                </Button>
                {target.index !== null && (
                    <Button
                        type="button"
                        variant="destructive"
                        size="lg"
                        onClick={() => onRemove(target)}
                    >
                        <Trash2 data-icon="inline-start" aria-hidden />
                        Eliminar franja
                    </Button>
                )}
            </SheetFooter>
        </form>
    );
}

/** The mobile editor of one range, as a bottom sheet over the day's timeline. */
export function RangeSheet({
    target,
    onClose,
    onApply,
    onRemove,
}: RangeSheetProps) {
    return (
        <Sheet
            open={target !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <SheetContent side="bottom" className="rounded-t-3xl pb-4">
                {target && (
                    <>
                        <SheetHeader>
                            <SheetTitle>
                                {target.index === null
                                    ? 'Nueva franja'
                                    : 'Editar franja'}
                            </SheetTitle>
                            <SheetDescription>
                                {DAY_NAMES[target.day]}
                            </SheetDescription>
                        </SheetHeader>
                        <RangeForm
                            key={`${target.day}-${target.index}`}
                            target={target}
                            onApply={onApply}
                            onRemove={onRemove}
                        />
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
