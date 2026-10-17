import { AUDIT_SUBJECT_LABELS } from '@/lib/labels';
import type { AdminAuditLog } from '@/types/audit';
import { Link } from '@tanstack/react-router';

const LINK_CLASS =
    'font-medium underline-offset-4 hover:underline focus-visible:underline';

type Subject = NonNullable<AdminAuditLog['subject']>;

/** The subject's detail page; a contact request has none (its detail is a Dialog on Contactos), so it stays plain text. */
function SubjectName({ subject }: { subject: Subject }) {
    const label = subject.label ?? `#${subject.id}`;
    const params = { id: subject.id };

    switch (subject.type) {
        case 'organization':
            return (
                <Link
                    to="/organizaciones/$id"
                    params={params}
                    className={LINK_CLASS}
                >
                    {label}
                </Link>
            );
        case 'user':
            return (
                <Link to="/usuarios/$id" params={params} className={LINK_CLASS}>
                    {label}
                </Link>
            );
        case 'subscription':
            return (
                <Link
                    to="/suscripciones/$id"
                    params={params}
                    className={LINK_CLASS}
                >
                    {label}
                </Link>
            );
        case 'contact_request':
            return <span className="font-medium">{label}</span>;
    }
}

/** "Sobre": the audited record, linked to its detail page; auth rows have none. */
export function AuditSubjectLink({
    subject,
}: {
    subject: AdminAuditLog['subject'];
}) {
    if (subject === null) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <span className="grid min-w-0">
            <span className="truncate">
                <SubjectName subject={subject} />
            </span>
            <span className="text-xs text-muted-foreground">
                {AUDIT_SUBJECT_LABELS[subject.type]}
            </span>
        </span>
    );
}
