import { Section } from '@/components/Section';
import { DaySlotDetail } from './DaySlotDetail';
import { DAY_SLOTS } from './day-slots';

export function DaySection() {
    return (
        <Section
            id="dia"
            eyebrow="Un día con Clini"
            title="Lo que pasa en tu consultorio mientras atendés"
            lead="Cada parte de Clini resuelve un momento concreto del día. Así se ve un martes cualquiera."
        >
            <ol className="grid list-none gap-4 p-0">
                {DAY_SLOTS.map((slot) => (
                    <li
                        key={slot.time}
                        className="grid grid-cols-1 gap-4 rounded-3xl border bg-card p-6 shadow-card md:grid-cols-[6rem_minmax(0,1fr)_minmax(0,0.9fr)] md:gap-8 md:py-7 md:pr-8"
                    >
                        <p className="text-3xl leading-none font-light tracking-tight tabular-nums">
                            <time>{slot.time}</time>
                            <span className="mt-1.5 block text-xs tracking-normal text-muted-foreground">
                                {slot.moment}
                            </span>
                        </p>
                        <div>
                            <h3 className="mb-2 text-xl font-medium tracking-tight">
                                {slot.title}
                            </h3>
                            <p className="max-w-[52ch] text-muted-foreground">
                                {slot.body}
                            </p>
                        </div>
                        <DaySlotDetail detail={slot.detail} />
                    </li>
                ))}
            </ol>
        </Section>
    );
}
