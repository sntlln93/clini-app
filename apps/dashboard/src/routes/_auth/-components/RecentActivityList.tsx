import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { ACTIVITY_KIND_LABELS } from '@/lib/labels';
import type { RecentActivity } from '@/types/overview';
import { Link } from '@tanstack/react-router';
import { Activity } from 'lucide-react';

const LINK_CLASS =
    'font-medium underline-offset-4 hover:underline focus-visible:underline';

/** The subject of an activity row, linked to its detail page. */
function SubjectLink({ subject }: { subject: RecentActivity['subject'] }) {
    const params = { id: subject.id };

    if (subject.type === 'organization') {
        return (
            <Link
                to="/organizaciones/$id"
                params={params}
                className={LINK_CLASS}
            >
                {subject.label}
            </Link>
        );
    }

    if (subject.type === 'user') {
        return (
            <Link to="/usuarios/$id" params={params} className={LINK_CLASS}>
                {subject.label}
            </Link>
        );
    }

    return (
        <Link to="/suscripciones/$id" params={params} className={LINK_CLASS}>
            {subject.label}
        </Link>
    );
}

export function RecentActivityList({
    activity,
}: {
    activity: RecentActivity[];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Actividad reciente</CardTitle>
                <CardDescription>
                    Altas de organizaciones y usuarios, y eventos de pago.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {activity.length === 0 ? (
                    <EmptyState
                        icon={Activity}
                        title="Sin actividad todavía"
                        description="Acá vas a ver las altas y los eventos de suscripción más recientes."
                    />
                ) : (
                    <ol className="divide-y">
                        {/* The index keeps keys unique: provider events of one subscription can share a second. The list is replaced whole, never reordered. */}
                        {activity.map((item, index) => (
                            <li
                                key={`${index}-${item.kind}-${item.subject.type}-${item.subject.id}-${item.occurred_at}`}
                                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                            >
                                <Badge variant="outline">
                                    {ACTIVITY_KIND_LABELS[item.kind]}
                                </Badge>
                                <span className="min-w-0 wrap-break-word">
                                    <SubjectLink subject={item.subject} />
                                    {item.detail && (
                                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                                            {item.detail}
                                        </span>
                                    )}
                                </span>
                                <span className="ml-auto text-xs whitespace-nowrap text-muted-foreground">
                                    {formatDateTime(item.occurred_at)}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </CardContent>
        </Card>
    );
}
