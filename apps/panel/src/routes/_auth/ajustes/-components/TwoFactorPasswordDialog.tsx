import { useRef, useState, type RefObject } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RecoveryCodesList } from './RecoveryCodesList';
import { TwoFactorPasswordForm } from './TwoFactorPasswordForm';

type TwoFactorPasswordDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // The trigger may be gone once the change lands: focus goes back here.
    finalFocus: RefObject<HTMLElement | null>;
    title: string;
    description: string;
    submitLabel: string;
    submitVariant?: 'default' | 'destructive';
    /** Resolves with new recovery codes to show them, or with nothing to just close. */
    onSubmit: (password: string) => Promise<string[] | void>;
};

/**
 * A change to the second factor that only needs the password: turning it
 * off, or new recovery codes. Opened by state from the section, so it stays
 * mounted while the section underneath changes.
 */
export function TwoFactorPasswordDialog({
    open,
    onOpenChange,
    finalFocus,
    title,
    description,
    submitLabel,
    submitVariant,
    onSubmit,
}: TwoFactorPasswordDialogProps) {
    const [codes, setCodes] = useState<string[] | null>(null);
    // Bumped on every close, so codes answered after it never show up later.
    const visit = useRef(0);

    function changeOpen(next: boolean) {
        if (!next) {
            visit.current += 1;
            setCodes(null);
        }
        onOpenChange(next);
    }

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent finalFocus={finalFocus}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {codes ? (
                    <>
                        <RecoveryCodesList codes={codes} />
                        <DialogFooter>
                            <Button
                                type="button"
                                onClick={() => changeOpen(false)}
                            >
                                Listo
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <TwoFactorPasswordForm
                        submitLabel={submitLabel}
                        submitVariant={submitVariant}
                        onCancel={() => changeOpen(false)}
                        onSubmit={async (password) => {
                            const current = visit.current;
                            const result = await onSubmit(password);
                            if (current !== visit.current) {
                                return;
                            }
                            if (result) {
                                setCodes(result);
                            } else {
                                changeOpen(false);
                            }
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
