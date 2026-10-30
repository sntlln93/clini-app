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
import {
    useConfirmTwoFactorSetup,
    useStartTwoFactorSetup,
    type TwoFactorSetup,
} from '../-hooks/use-two-factor';
import { RecoveryCodesList } from './RecoveryCodesList';
import { TwoFactorPasswordForm } from './TwoFactorPasswordForm';
import { TwoFactorSetupForm } from './TwoFactorSetupForm';

type Step =
    | { name: 'password' }
    | { name: 'setup'; setup: TwoFactorSetup }
    | { name: 'codes'; codes: string[] };

const DESCRIPTIONS: Record<Step['name'], string> = {
    password: 'Para empezar, confirmá tu contraseña.',
    setup: 'Agregá la cuenta a tu app de autenticación.',
    codes: 'La verificación en dos pasos quedó activada.',
};

type EnableTwoFactorDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // The trigger is gone once the factor is on: focus goes back here.
    finalFocus: RefObject<HTMLElement | null>;
};

/**
 * Password, then the QR code and its first code, then the recovery codes.
 * Opened by state from the section, so the codes stay on screen while the
 * section underneath already shows the factor on.
 */
export function EnableTwoFactorDialog({
    open,
    onOpenChange,
    finalFocus,
}: EnableTwoFactorDialogProps) {
    const [step, setStep] = useState<Step>({ name: 'password' });
    // Bumped on every close: an answer that lands after the dialog closed
    // belongs to a flow the user left, and must not reopen on its step.
    const visit = useRef(0);
    const start = useStartTwoFactorSetup();
    const confirm = useConfirmTwoFactorSetup();

    function changeOpen(next: boolean) {
        if (!next) {
            visit.current += 1;
            setStep({ name: 'password' });
        }
        onOpenChange(next);
    }

    function stepIfStillOpen(current: number, next: Step) {
        if (current === visit.current) {
            setStep(next);
        }
    }

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent finalFocus={finalFocus}>
                <DialogHeader>
                    <DialogTitle>
                        Activar la verificación en dos pasos
                    </DialogTitle>
                    <DialogDescription>
                        {DESCRIPTIONS[step.name]}
                    </DialogDescription>
                </DialogHeader>
                {step.name === 'password' && (
                    <TwoFactorPasswordForm
                        submitLabel="Continuar"
                        onCancel={() => changeOpen(false)}
                        onSubmit={async (password) => {
                            const current = visit.current;
                            const setup = await start.mutateAsync(password);
                            stepIfStillOpen(current, { name: 'setup', setup });
                        }}
                    />
                )}
                {step.name === 'setup' && (
                    <TwoFactorSetupForm
                        setup={step.setup}
                        onCancel={() => changeOpen(false)}
                        onConfirm={async (code) => {
                            const current = visit.current;
                            const codes = await confirm.mutateAsync(code);
                            stepIfStillOpen(current, { name: 'codes', codes });
                        }}
                    />
                )}
                {step.name === 'codes' && (
                    <>
                        <RecoveryCodesList codes={step.codes} />
                        <DialogFooter>
                            <Button
                                type="button"
                                onClick={() => changeOpen(false)}
                            >
                                Listo
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
