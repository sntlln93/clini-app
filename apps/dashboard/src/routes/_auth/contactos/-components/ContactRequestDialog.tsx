import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { ContactRequestStatusBadge } from '@/features/status-badges/ContactRequestStatusBadge';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PLAN_LABELS } from '@/lib/labels';
import type {
    AdminContactRequest,
    ContactRequestStatus,
} from '@/types/contact-request';
import { Eye } from 'lucide-react';
import { useState, type ReactNode, type RefObject } from 'react';
import { useChangeContactRequestStatus } from '../-hooks/use-change-contact-request-status';

const LINK_CLASS = 'underline-offset-4 hover:underline focus-visible:underline';

/** The moves offered from each status; a closed request can only be reopened. */
const TRANSITIONS: Record<
    ContactRequestStatus,
    Array<{ to: ContactRequestStatus; label: string }>
> = {
    new: [
        { to: 'in_progress', label: 'Marcar en curso' },
        { to: 'closed', label: 'Cerrar' },
    ],
    in_progress: [
        { to: 'new', label: 'Volver a nueva' },
        { to: 'closed', label: 'Cerrar' },
    ],
    closed: [{ to: 'in_progress', label: 'Reabrir' }],
};

function Detail({ term, children }: { term: string; children: ReactNode }) {
    return (
        <div className="grid min-w-0 gap-0.5">
            <dt className="text-xs text-muted-foreground">{term}</dt>
            <dd className="wrap-break-word">{children ?? '—'}</dd>
        </div>
    );
}

/** "Ver": the whole request, and the status moves. The team answers outside Clini, by mail or phone. */
export type ContactRequestDialogProps = {
    contactRequest: AdminContactRequest;
    /** Whether the current list still shows a request in this status (its filter). */
    isListed: (status: ContactRequestStatus) => boolean;
    /** Where focus goes when a change takes the request (and this trigger) off the list. */
    fallbackFocus: RefObject<HTMLElement | null>;
};

export function ContactRequestDialog({
    contactRequest,
    isListed,
    fallbackFocus,
}: ContactRequestDialogProps) {
    const [open, setOpen] = useState(false);
    const [movedTo, setMovedTo] = useState<ContactRequestStatus | null>(null);
    const { mutate, isPending, variables } = useChangeContactRequestStatus(
        contactRequest.id,
        (status) => {
            setMovedTo(status);
            setOpen(false);
        },
    );

    function handleOpenChange(next: boolean) {
        if (next) {
            setMovedTo(null);
        }
        setOpen(next);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Ver la consulta de ${contactRequest.name}`}
                    >
                        <Eye data-icon="inline-start" />
                        Ver
                    </Button>
                }
            />
            <DialogContent
                className="sm:max-w-xl"
                finalFocus={() =>
                    movedTo !== null && !isListed(movedTo)
                        ? fallbackFocus.current
                        : true
                }
            >
                <DialogHeader>
                    <DialogTitle>Consulta de {contactRequest.name}</DialogTitle>
                    <DialogDescription>
                        Recibida el {formatDateTime(contactRequest.created_at)}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <ContactRequestStatusBadge status={contactRequest.status} />
                    {contactRequest.handled_by && (
                        <span className="text-muted-foreground">
                            Último cambio: {contactRequest.handled_by.name}
                        </span>
                    )}
                </div>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <Detail term="Correo">
                        <a
                            href={`mailto:${contactRequest.email}`}
                            className={LINK_CLASS}
                        >
                            {contactRequest.email}
                        </a>
                    </Detail>
                    <Detail term="Teléfono">
                        {contactRequest.phone && (
                            <a
                                href={`tel:${contactRequest.phone}`}
                                className={LINK_CLASS}
                            >
                                {contactRequest.phone}
                            </a>
                        )}
                    </Detail>
                    <Detail term="Consultorio o centro">
                        {contactRequest.organization_name}
                    </Detail>
                    <Detail term="Profesionales">
                        {contactRequest.team_size === null
                            ? null
                            : formatNumber(contactRequest.team_size)}
                    </Detail>
                    <Detail term="Plan de interés">
                        {contactRequest.plan === null
                            ? 'Sin definir'
                            : PLAN_LABELS[contactRequest.plan]}
                    </Detail>
                </dl>
                <div className="grid gap-1 text-sm">
                    <span className="text-xs text-muted-foreground">
                        Mensaje
                    </span>
                    <p className="max-h-[40vh] overflow-auto rounded-md bg-muted p-3 wrap-break-word whitespace-pre-line">
                        {contactRequest.message}
                    </p>
                </div>
                <DialogFooter>
                    {TRANSITIONS[contactRequest.status].map((transition) => (
                        <Button
                            key={transition.to}
                            type="button"
                            variant={
                                transition.to === 'closed'
                                    ? 'default'
                                    : 'outline'
                            }
                            disabled={isPending}
                            onClick={() => mutate(transition.to)}
                        >
                            {isPending && variables === transition.to && (
                                <Spinner data-icon="inline-start" />
                            )}
                            {transition.label}
                        </Button>
                    ))}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
