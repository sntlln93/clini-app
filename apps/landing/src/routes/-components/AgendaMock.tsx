import { APPOINTMENT_TONES, LEGEND_ORDER } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';
import { Check, Clock } from 'lucide-react';
import { AgendaColumn } from './AgendaColumn';
import { HALF_HOURS, PROFESSIONALS, offsetFor } from './agenda-data';

/** A read-only picture of the panel's day view, with example data. */
export function AgendaMock() {
    return (
        <div className="relative min-w-0 pb-6">
            <div className="mb-4 inline-grid animate-in gap-1 rounded-3xl border bg-card px-5 py-4 shadow-card duration-700 fill-mode-both slide-in-from-bottom-2 lg:absolute lg:-top-10 lg:-right-6 lg:z-10 lg:mb-0">
                <span className="text-sm text-muted-foreground">
                    Turnos de hoy
                </span>
                <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                        <Clock aria-hidden="true" className="size-5" />
                    </span>
                    <span className="text-4xl tracking-tight tabular-nums">
                        23
                    </span>
                    <span className="max-w-36 text-xs leading-snug text-success">
                        6 reservados online mientras atendías
                    </span>
                </div>
            </div>
            <figure
                aria-label="Ejemplo de la agenda de Clini con tres profesionales"
                className="m-0 overflow-hidden rounded-3xl border bg-card shadow-card"
            >
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <strong className="text-lg font-medium">
                        Martes 14 de octubre
                    </strong>
                    <div className="flex gap-1.5 text-xs">
                        <span className="rounded-full bg-primary px-3.5 py-1.5 text-primary-foreground">
                            Día
                        </span>
                        <span className="rounded-full border px-3.5 py-1.5 text-muted-foreground">
                            Semana
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto px-2.5">
                    <div className="grid min-w-lg grid-cols-[3.4rem_repeat(3,minmax(9.5rem,1fr))]">
                        <div />
                        {PROFESSIONALS.map((professional) => (
                            <div
                                key={professional.name}
                                className="flex items-center gap-2 px-2 pt-2 pb-3 text-xs leading-tight"
                            >
                                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[0.7rem] font-medium text-primary">
                                    {professional.initials}
                                </span>
                                <span>
                                    <b className="block font-medium">
                                        {professional.name}
                                    </b>
                                    <span className="text-muted-foreground">
                                        {professional.specialty}
                                    </span>
                                </span>
                            </div>
                        ))}
                        <div className="relative h-108">
                            {HALF_HOURS.map((time, index) => (
                                <span
                                    key={time}
                                    style={{ top: offsetFor(time) }}
                                    className={cn(
                                        'absolute right-2 text-[0.7rem] text-muted-foreground tabular-nums',
                                        index > 0 && '-translate-y-1/2',
                                    )}
                                >
                                    {time}
                                </span>
                            ))}
                        </div>
                        {PROFESSIONALS.map((professional, index) => (
                            <AgendaColumn
                                key={professional.name}
                                appointments={professional.appointments}
                                showNow={index === 2}
                            />
                        ))}
                    </div>
                </div>
                <figcaption className="flex flex-wrap gap-x-4 gap-y-2 px-5 pt-3 pb-5 text-xs text-muted-foreground">
                    {LEGEND_ORDER.map((tone) => (
                        <span
                            key={tone}
                            className="inline-flex items-center gap-1.5"
                        >
                            <span
                                className={cn(
                                    'size-2.5 rounded-full',
                                    APPOINTMENT_TONES[tone].dot,
                                )}
                            />
                            {APPOINTMENT_TONES[tone].label}
                        </span>
                    ))}
                </figcaption>
            </figure>
            <p
                role="status"
                className="absolute bottom-0 left-4 z-10 flex max-w-[calc(100%-2rem)] animate-in items-center gap-2.5 rounded-full bg-foreground py-2.5 pr-4 pl-2.5 text-xs text-background shadow-lg delay-1000 duration-700 fill-mode-both slide-in-from-bottom-2"
            >
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check aria-hidden="true" className="size-3" />
                </span>
                Lucía Gómez reservó a las 10:30 desde su celular
            </p>
        </div>
    );
}
