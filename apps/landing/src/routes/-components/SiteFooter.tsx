// Same on the server (UTC) and in the browser, so the year can't differ
// between the server HTML and hydration around New Year's Eve.
const YEAR = new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
}).format(new Date());

export function SiteFooter() {
    return (
        <footer className="flex flex-wrap justify-between gap-4 pt-4 pb-10 text-xs text-muted-foreground">
            <span>© {YEAR} Clini · Hecho en Argentina</span>
            <span>
                Turnos online para profesionales, consultorios y centros médicos
            </span>
        </footer>
    );
}
