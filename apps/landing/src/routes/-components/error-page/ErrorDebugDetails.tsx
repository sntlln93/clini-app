import type { ErrorDetails } from '@/lib/error-details';

/** Debug mode only (#304): the exact error, like Laravel's own debug page — never rendered in a build without `VITE_APP_DEBUG`. */
export function ErrorDebugDetails({ details }: { details: ErrorDetails }) {
    return (
        <div className="grid w-full min-w-0 gap-4 text-left">
            <div className="grid gap-1">
                <p className="font-mono text-sm break-all text-muted-foreground">
                    {details.name}
                </p>
                <h1 className="text-2xl tracking-tight wrap-break-word sm:text-3xl">
                    {details.message || 'Sin mensaje'}
                </h1>
            </div>
            <dl className="grid gap-1 font-mono text-sm break-all">
                {details.request && (
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="text-muted-foreground">Solicitud</dt>
                        <dd>
                            {details.request.method} {details.request.url} →{' '}
                            {details.request.status}
                        </dd>
                    </div>
                )}
                {details.location && (
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="text-muted-foreground">Ubicación</dt>
                        <dd>{details.location}</dd>
                    </div>
                )}
            </dl>
            {details.trace.length > 0 ? (
                <ol
                    aria-label="Traza"
                    className="max-h-96 overflow-auto rounded-2xl border bg-muted p-4 font-mono text-xs leading-relaxed"
                >
                    {details.trace.map((frame, index) => (
                        <li key={index} className="whitespace-pre">
                            {frame}
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="text-sm text-muted-foreground">
                    Sin traza: con un error de la API, activá `APP_DEBUG` en la
                    API para verla.
                </p>
            )}
        </div>
    );
}
