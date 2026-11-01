import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DeleteAccountForm } from './DeleteAccountForm';

type DeleteAccountSectionProps = {
    twoFactorEnabled: boolean;
};

/**
 * Where a user asks to delete their own account (#384). The API decides
 * what goes and what stays; this says it before asking for the password.
 */
export function DeleteAccountSection({
    twoFactorEnabled,
}: DeleteAccountSectionProps) {
    const [open, setOpen] = useState(false);
    const titleRef = useRef<HTMLHeadingElement>(null);

    return (
        <section className="space-y-3">
            <div className="space-y-2">
                <h2
                    ref={titleRef}
                    tabIndex={-1}
                    className="text-sm font-medium outline-none"
                >
                    Eliminar cuenta
                </h2>
                <p className="text-sm text-muted-foreground">
                    Al pedirlo dejás de figurar en la agenda y en la reserva
                    online de todos tus consultorios, y se cierran tus sesiones.
                    Tu cuenta se elimina a los 7 días: si cambiás de idea,
                    ingresá antes con tu correo y tu contraseña y todo vuelve a
                    estar como antes.
                </p>
                <p className="text-sm text-muted-foreground">
                    Se borran tu correo, tu contraseña, tu verificación en dos
                    pasos, tu DNI, tus matrículas y tus especialidades. Lo que
                    registraste en historias clínicas se conserva con tu nombre,
                    porque la ley obliga a guardarlo.
                </p>
                <p className="text-sm text-muted-foreground">
                    Si sos la única persona que administra un consultorio, o
                    tenés turnos por atender, resolvelo antes de pedirlo.
                </p>
            </div>
            <Button
                type="button"
                variant="destructive"
                onClick={() => setOpen(true)}
            >
                Eliminar cuenta
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent finalFocus={titleRef}>
                    <DialogHeader>
                        <DialogTitle>Eliminar tu cuenta</DialogTitle>
                        <DialogDescription>
                            {twoFactorEnabled
                                ? 'Confirmá con tu contraseña y el código de tu app de autenticación.'
                                : 'Confirmá con tu contraseña.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DeleteAccountForm
                        twoFactorEnabled={twoFactorEnabled}
                        onCancel={() => setOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </section>
    );
}
