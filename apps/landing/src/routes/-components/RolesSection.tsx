import { Indented, Section } from '@/components/Section';

const ROLES = [
    {
        badge: 'Dueño y administración',
        title: 'Arma el consultorio',
        items: [
            'Invita al equipo y asigna roles',
            'Ve la agenda de todos los profesionales',
            'El dueño gestiona la suscripción',
        ],
    },
    {
        badge: 'Profesional',
        title: 'Atiende',
        items: [
            'Arma su horario semanal y sus excepciones',
            'Elige sus prestaciones, con duración y precio',
            'Comparte su propio link de reservas',
            'Escribe notas y recetas de sus visitas',
        ],
    },
    {
        badge: 'Recepción',
        title: 'Coordina',
        items: [
            'Carga turnos que entran por teléfono',
            'Marca llegadas en la sala de espera',
            'Cancela y reprograma',
        ],
    },
];

export function RolesSection() {
    return (
        <Section
            eyebrow="Para todo el equipo"
            title="Cada persona ve lo que necesita"
            lead="Invitás a tu equipo por mail y le asignás un rol. Los feriados nacionales y provinciales se cargan solos. Si alguien deja el consultorio, sus turnos y su historial quedan."
        >
            <Indented>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {ROLES.map((role) => (
                        <article
                            key={role.badge}
                            className="flex flex-col gap-3 rounded-3xl border bg-card p-6 shadow-card"
                        >
                            <span className="self-start rounded-full border border-success px-2.5 py-0.5 text-xs text-success">
                                {role.badge}
                            </span>
                            <h3 className="text-xl font-medium">
                                {role.title}
                            </h3>
                            <ul className="grid list-none gap-2 p-0 text-sm text-muted-foreground">
                                {role.items.map((item) => (
                                    <li key={item} className="flex gap-2.5">
                                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </Indented>
        </Section>
    );
}
