import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

/**
 * The owner's way into the list of exceptional accesses to the clinical
 * history (#325, ADR 0022): it is the owner's alone, like billing. Brings its
 * own separator, since the page renders it only for the owner.
 */
export function ExceptionalAccessesSection() {
    return (
        <>
            <Separator />
            <section className="space-y-3">
                <div className="space-y-1">
                    <h2 className="text-sm font-medium">
                        Accesos a la historia clínica
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Mirá quién abrió la historia clínica de un paciente sin
                        un turno cercano con él, cuándo y por qué motivo. No
                        muestra nada del contenido de la historia.
                    </p>
                </div>
                <Link
                    to="/accesos-excepcionales"
                    className={cn(buttonVariants({ variant: 'outline' }))}
                >
                    Ver accesos
                </Link>
            </section>
        </>
    );
}
