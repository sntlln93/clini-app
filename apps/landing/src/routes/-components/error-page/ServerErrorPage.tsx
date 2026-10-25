import { isAppDebug } from '@/lib/app-debug';
import { detailsFromThrown } from '@/lib/error-details';
import { useLocation, type ErrorComponentProps } from '@tanstack/react-router';
import { CtaLink } from '../CtaLink';
import { SiteFooter } from '../SiteFooter';
import { SiteHeader } from '../SiteHeader';
import { ErrorDebugDetails } from './ErrorDebugDetails';
import { ErrorPageLayout } from './ErrorPageLayout';

/** A route that failed to render, instead of the router's own English page (#304); in debug mode, the exact error. */
export function ServerErrorPage({ error }: ErrorComponentProps) {
    // A full load of the same URL: the plain link works before hydration too.
    const { href } = useLocation();
    const retry = <CtaLink href={href}>Reintentar</CtaLink>;
    const home = (
        <CtaLink href="/" variant="outline">
            Volver al inicio
        </CtaLink>
    );

    if (isAppDebug()) {
        return (
            <div className="mx-auto max-w-295 px-4 sm:px-6 lg:px-12">
                <SiteHeader />
                <main id="top" className="grid gap-6 py-16">
                    <p className="text-sm font-medium tracking-[0.2em] text-primary uppercase">
                        Error inesperado · modo debug
                    </p>
                    <ErrorDebugDetails details={detailsFromThrown(error)} />
                    <div className="flex flex-wrap gap-3">
                        {retry}
                        {home}
                    </div>
                </main>
                <SiteFooter />
            </div>
        );
    }

    return (
        <ErrorPageLayout
            badge="server"
            eyebrow="Error inesperado"
            title="Algo no salió como esperábamos"
            description="No pudimos cargar esta página. Probá de nuevo en unos minutos."
            actions={
                <>
                    {retry}
                    {home}
                </>
            }
        />
    );
}
