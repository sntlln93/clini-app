import { Indented, Section } from '@/components/Section';
import { Plus } from 'lucide-react';

const QUESTIONS = [
    {
        q: '¿Mis pacientes necesitan crear una cuenta para reservar?',
        a: 'No. Entran a tu link, eligen el horario y dejan su nombre y documento (DNI, pasaporte o número de afiliado). Nada de usuarios ni contraseñas.',
    },
    {
        q: 'Si un paciente se atiende en otro consultorio con Clini, ¿ven mis notas?',
        a: 'No. Los datos básicos del paciente se comparten para no cargarlos dos veces, pero las notas clínicas, las recetas y los turnos pertenecen a cada consultorio.',
    },
    {
        q: '¿Las recetas sirven como receta electrónica?',
        a: 'No. Son recetas estructuradas para imprimir y llevan la leyenda «Documento sin validez como receta electrónica». No reemplazan a la receta electrónica con firma digital de la Ley 27.553.',
    },
    {
        q: '¿Qué pasa si un mes no se puede cobrar la suscripción?',
        a: 'Te avisamos por mail y tenés 7 días para regularizar. Si vence ese plazo, la agenda queda en solo lectura: podés ver todo, pero no cargar turnos, notas ni recetas hasta que se acredite el pago.',
    },
    {
        q: '¿Cómo cancela un paciente su turno?',
        a: 'Se comunica con el consultorio y recepción lo cancela o reprograma desde la agenda. El horario queda libre al instante para otra reserva.',
    },
    {
        q: '¿Sirve para un centro médico con muchos profesionales?',
        a: 'Sí. Si son más de 5 profesionales o atienden en varias sedes, el plan Centro se arma a medida: migramos tus datos y capacitamos al equipo.',
    },
];

export function FaqSection() {
    return (
        <Section
            id="preguntas"
            eyebrow="Preguntas"
            title="Lo que nos preguntan antes de empezar"
        >
            <Indented>
                <div className="grid max-w-205 gap-2.5">
                    {QUESTIONS.map((item) => (
                        <details
                            key={item.q}
                            className="group rounded-2xl border bg-card px-5 py-4"
                        >
                            <summary className="flex cursor-pointer list-none justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                                {item.q}
                                <span className="grid size-7 shrink-0 place-items-center rounded-full border text-muted-foreground transition-transform group-open:rotate-45 group-open:border-primary group-open:bg-primary group-open:text-primary-foreground">
                                    <Plus
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                </span>
                            </summary>
                            <p className="mt-2.5 max-w-[64ch] text-sm text-muted-foreground">
                                {item.a}
                            </p>
                        </details>
                    ))}
                </div>
            </Indented>
        </Section>
    );
}
