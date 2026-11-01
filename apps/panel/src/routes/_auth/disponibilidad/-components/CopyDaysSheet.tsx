import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { CopyDaysPicker } from './CopyDaysPicker';
import { copyDaysDescription } from './week-labels';

type CopyDaysSheetProps = {
    from: number | null;
    onClose: () => void;
    onCopy: (from: number, days: number[]) => void;
};

export function CopyDaysSheet({ from, onClose, onCopy }: CopyDaysSheetProps) {
    return (
        <Sheet open={from !== null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="rounded-t-3xl pb-4">
                {from !== null && (
                    <>
                        <SheetHeader>
                            <SheetTitle>Copiar a otros días</SheetTitle>
                            <SheetDescription>
                                {copyDaysDescription(from)}
                            </SheetDescription>
                        </SheetHeader>
                        <div className="px-4">
                            <CopyDaysPicker
                                from={from}
                                withHeading={false}
                                onCopy={(days) => onCopy(from, days)}
                            />
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
