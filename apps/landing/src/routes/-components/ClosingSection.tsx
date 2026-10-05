import { contactUrl, registerUrl } from '@/lib/links';
import { CtaLink } from './CtaLink';

export function ClosingSection() {
    return (
        <section
            aria-labelledby="cierre-title"
            className="my-12 grid grid-cols-1 gap-6 rounded-[2rem] bg-mint px-8 py-12 md:grid-cols-[5.5rem_1fr] md:px-12 md:py-16 md:pl-8"
        >
            <span className="text-muted-foreground">
                Empezá hoy, sin tarjeta
            </span>
            <div className="grid gap-6">
                <h2
                    id="cierre-title"
                    className="max-w-[16ch] text-[clamp(2.2rem,5vw,3.75rem)] leading-tight tracking-tight"
                >
                    Dejá de coordinar turnos por teléfono.
                </h2>
                <div className="flex flex-wrap gap-3">
                    <CtaLink href={registerUrl}>Empezar gratis</CtaLink>
                    {contactUrl ? (
                        <CtaLink href={contactUrl} variant="outline">
                            Hablar con nosotros
                        </CtaLink>
                    ) : (
                        <CtaLink href="#precio" variant="outline">
                            Ver planes
                        </CtaLink>
                    )}
                </div>
            </div>
        </section>
    );
}
