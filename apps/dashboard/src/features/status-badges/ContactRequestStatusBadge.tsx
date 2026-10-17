import { StatusPill } from '@/components/StatusPill';
import {
    CONTACT_REQUEST_STATUS_LABELS,
    CONTACT_REQUEST_STATUS_TONES,
} from '@/lib/labels';
import type { ContactRequestStatus } from '@/types/contact-request';

export function ContactRequestStatusBadge({
    status,
}: {
    status: ContactRequestStatus;
}) {
    return (
        <StatusPill tone={CONTACT_REQUEST_STATUS_TONES[status]}>
            {CONTACT_REQUEST_STATUS_LABELS[status]}
        </StatusPill>
    );
}
