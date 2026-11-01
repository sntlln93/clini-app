import { Button } from '@/components/ui/button';

/**
 * Where a user will ask to delete their account. Only the place for now: the
 * deletion itself needs the API first (#384), so the button stays disabled
 * and says so.
 */
export function DeleteAccountSection() {
    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Eliminar cuenta</h2>
                <p className="text-sm text-muted-foreground">
                    Pronto vas a poder pedir desde acá que eliminemos tu cuenta.
                </p>
            </div>
            <Button type="button" variant="destructive" disabled>
                Eliminar cuenta
            </Button>
        </section>
    );
}
