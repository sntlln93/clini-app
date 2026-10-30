import { useRef, useState } from 'react';

import { StatusPill } from '@/components/StatusPill';
import { Button } from '@/components/ui/button';
import { notifySuccess } from '@/lib/toast';
import {
    useDisableTwoFactor,
    useRegenerateRecoveryCodes,
} from '../-hooks/use-two-factor';
import { EnableTwoFactorDialog } from './EnableTwoFactorDialog';
import { TwoFactorPasswordDialog } from './TwoFactorPasswordDialog';

type TwoFactorSectionProps = {
    enabled: boolean;
};

type OpenDialog = 'enable' | 'regenerate' | 'disable' | null;

/** The signed-in user's own TOTP second factor (#357), open to every clinic user. */
export function TwoFactorSection({ enabled }: TwoFactorSectionProps) {
    const [dialog, setDialog] = useState<OpenDialog>(null);
    // Turning the factor on or off swaps the buttons that opened the
    // dialogs, so every dialog hands focus back to the section's title.
    const titleRef = useRef<HTMLHeadingElement>(null);
    const disable = useDisableTwoFactor();
    const regenerate = useRegenerateRecoveryCodes();

    function openChange(name: Exclude<OpenDialog, null>) {
        return (open: boolean) => setDialog(open ? name : null);
    }

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2
                        ref={titleRef}
                        tabIndex={-1}
                        className="text-sm font-medium outline-none"
                    >
                        Verificación en dos pasos
                    </h2>
                    <StatusPill tone={enabled ? 'success' : 'neutral'}>
                        {enabled ? 'Activada' : 'Desactivada'}
                    </StatusPill>
                </div>
                <p className="text-sm text-muted-foreground">
                    {enabled
                        ? 'Al iniciar sesión, después de la contraseña te pedimos el código de tu app de autenticación.'
                        : 'Sumá un código de una app de autenticación a tu contraseña, así nadie entra a tu cuenta solo con ella.'}
                </p>
            </div>

            {enabled ? (
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialog('regenerate')}
                    >
                        Generar códigos nuevos
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialog('disable')}
                    >
                        Desactivar
                    </Button>
                </div>
            ) : (
                <Button type="button" onClick={() => setDialog('enable')}>
                    Activar
                </Button>
            )}

            <EnableTwoFactorDialog
                open={dialog === 'enable'}
                onOpenChange={openChange('enable')}
                finalFocus={titleRef}
            />
            <TwoFactorPasswordDialog
                open={dialog === 'regenerate'}
                onOpenChange={openChange('regenerate')}
                finalFocus={titleRef}
                title="Generar códigos de recuperación nuevos"
                description="Los códigos anteriores dejan de servir. Confirmá tu contraseña."
                submitLabel="Generar"
                onSubmit={(password) => regenerate.mutateAsync(password)}
            />
            <TwoFactorPasswordDialog
                open={dialog === 'disable'}
                onOpenChange={openChange('disable')}
                finalFocus={titleRef}
                title="Desactivar la verificación en dos pasos"
                description="Vas a poder ingresar solo con tu contraseña. Confirmala para seguir."
                submitLabel="Desactivar"
                submitVariant="destructive"
                onSubmit={async (password) => {
                    await disable.mutateAsync(password);
                    notifySuccess('Verificación en dos pasos desactivada');
                }}
            />
        </section>
    );
}
