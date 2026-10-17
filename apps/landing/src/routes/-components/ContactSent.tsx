import { CircleCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CtaLink } from './CtaLink';

/** Replaces the form once the request is in; takes focus so a screen reader announces it. */
export function ContactSent({ name, email }: { name: string; email: string }) {
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    return (
        <div className="grid justify-items-start gap-4 rounded-3xl border bg-card p-7 shadow-card">
            <CircleCheck aria-hidden="true" className="size-8 text-success" />
            <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-medium outline-none"
            >
                ¡Gracias, {name}!
            </h2>
            <p className="max-w-[52ch] text-muted-foreground">
                Recibimos tu consulta. Te vamos a responder a{' '}
                <strong className="font-medium text-foreground">{email}</strong>
                .
            </p>
            <CtaLink href="/" variant="outline">
                Volver al inicio
            </CtaLink>
        </div>
    );
}
