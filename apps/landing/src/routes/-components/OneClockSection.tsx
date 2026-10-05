export function OneClockSection() {
    return (
        <section
            aria-labelledby="reloj-title"
            className="my-16 grid grid-cols-1 items-center gap-8 rounded-3xl border bg-card p-8 shadow-card md:grid-cols-[5.5rem_1fr_1fr] md:p-10 md:pl-8"
        >
            <span className="text-muted-foreground">Sin turnos pisados</span>
            <div>
                <h2
                    id="reloj-title"
                    className="max-w-[18ch] text-3xl leading-tight tracking-tight md:text-[2.75rem]"
                >
                    Atendés en dos consultorios. Tenés un solo reloj.
                </h2>
                <p className="mt-4 max-w-[50ch] text-muted-foreground">
                    Muchos profesionales reparten la semana entre varios
                    lugares. Clini sabe que sos la misma persona: si ya tenés un
                    turno a las 10 en un consultorio, ese horario no se puede
                    ofrecer en el otro. Cada consultorio sigue viendo solo su
                    propia agenda.
                </p>
            </div>
            <ul
                aria-label="Ejemplo de una profesional en dos consultorios"
                className="grid list-none gap-3 p-0"
            >
                <li className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-2xl bg-secondary px-4 py-3.5 text-sm">
                    <span>Consultorio Belgrano</span>
                    <span className="font-medium tabular-nums">Jue 10:00</span>
                    <small className="col-span-2 text-xs text-success">
                        Turno confirmado · Dra. Inés Robles
                    </small>
                </li>
                <li className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-2xl bg-destructive-wash px-4 py-3.5 text-sm">
                    <span>Centro Odontológico Palermo</span>
                    <s className="font-medium text-muted-foreground tabular-nums decoration-destructive decoration-2">
                        Jue 10:00
                    </s>
                    <small className="col-span-2 text-xs text-destructive">
                        No disponible: la profesional ya tiene un turno a esa
                        hora
                    </small>
                </li>
            </ul>
        </section>
    );
}
