import { contactUrl } from '@/lib/links';
import { CtaLink } from '../CtaLink';
import { ErrorPageLayout } from './ErrorPageLayout';

/** Any URL no route matches; the server answers it with a 404. */
export function NotFoundPage() {
    return (
        <ErrorPageLayout
            badge="not_found"
            eyebrow="Error 404"
            title="No encontramos esta página"
            description="Puede que el enlace haya cambiado o ya no exista."
            actions={
                <>
                    <CtaLink href="/">Volver al inicio</CtaLink>
                    <CtaLink href={contactUrl()} variant="outline">
                        Escribinos
                    </CtaLink>
                </>
            }
        />
    );
}
