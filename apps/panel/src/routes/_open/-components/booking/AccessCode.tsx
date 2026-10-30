/**
 * The appointment's access code (#364, ADR 0029), the same one the patient was
 * mailed: shared during the appointment, it lets whoever attends them read
 * what other professionals recorded. Sharing it is the patient's call.
 */
export function AccessCode({ code }: { code: string }) {
    return (
        <section
            aria-labelledby="access-code-title"
            className="space-y-2 rounded-lg border p-4"
        >
            <h2 id="access-code-title" className="text-sm font-medium">
                Tu código para el turno
            </h2>
            <p className="font-mono text-2xl tracking-widest">{code}</p>
            <p className="text-sm text-muted-foreground">
                Si querés que quien te atienda vea lo que otros profesionales
                registraron en tus consultas anteriores, compartile este código
                durante el turno. Sirve una sola vez y solo para este turno.
            </p>
        </section>
    );
}
