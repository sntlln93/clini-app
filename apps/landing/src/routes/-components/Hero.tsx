import { registerUrl } from '@/lib/links';
import { AgendaMock } from './AgendaMock';
import { CtaLink } from './CtaLink';

export function Hero() {
    return (
        <div className="grid grid-cols-1 items-center gap-14 py-12 lg:grid-cols-[0.95fr_1.1fr] lg:gap-12 lg:py-16">
            <div className="flex min-w-0 flex-col gap-6">
                <span className="inline-flex items-center gap-2 self-start rounded-full border bg-card py-1.5 pr-3 pl-2 text-[0.8rem]">
                    <span className="size-2 rounded-full bg-success" />
                    Turnos online para profesionales y consultorios
                </span>
                <h1 className="text-[clamp(2.7rem,6.2vw,4.9rem)] leading-none tracking-[-0.04em]">
                    Tus pacientes reservan solos. Vos{' '}
                    <span className="text-primary">atendés</span>.
                </h1>
                <p className="max-w-[34ch] text-xl leading-snug font-light text-muted-foreground">
                    Agenda, reserva online, recordatorios y sala de espera en un
                    solo lugar. Menos llamadas para coordinar, más tiempo para
                    la consulta.
                </p>
                <div className="flex flex-wrap gap-3">
                    <CtaLink href={registerUrl}>Empezar gratis</CtaLink>
                    <CtaLink href="#dia" variant="outline">
                        Ver cómo funciona
                    </CtaLink>
                </div>
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    Tu link de reservas:
                    <code className="rounded-full border bg-card px-3 py-1 font-sans text-foreground">
                        …/reservar/
                        <b className="font-medium text-primary">
                            consultorio-belgrano
                        </b>
                    </code>
                </p>
            </div>
            <AgendaMock />
        </div>
    );
}
