import { AUDIT_SUBJECT_LABELS } from '@/lib/labels';
import type { AdminAuditLog } from '@/types/audit';
import { Link } from '@tanstack/react-router';

const LINK_CLASS =
    'font-medium underline-offset-4 hover:underline focus-visible:underline';

/** "Sobre": the audited record, linked to its detail page; auth rows have none. */
export function AuditSubjectLink({
    subject,
}: {
    subject: AdminAuditLog['subject'];
}) {
    if (subject === null) {
        return <span className="text-muted-foreground">—</span>;
    }

    const label = subject.label ?? `#${subject.id}`;
    const params = { id: subject.id };
    const link =
        subject.type === 'organization' ? (
            <Link
                to="/organizaciones/$id"
                params={params}
                className={LINK_CLASS}
            >
                {label}
            </Link>
        ) : subject.type === 'user' ? (
            <Link to="/usuarios/$id" params={params} className={LINK_CLASS}>
                {label}
            </Link>
        ) : (
            <Link
                to="/suscripciones/$id"
                params={params}
                className={LINK_CLASS}
            >
                {label}
            </Link>
        );

    return (
        <span className="grid min-w-0">
            <span className="truncate">{link}</span>
            <span className="text-xs text-muted-foreground">
                {AUDIT_SUBJECT_LABELS[subject.type]}
            </span>
        </span>
    );
}
