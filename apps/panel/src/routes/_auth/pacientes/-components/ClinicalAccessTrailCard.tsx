import { DataTablePagination } from '@/components/DataTablePagination';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { describeTrailEntry } from '@/lib/clinical-access';
import { formatShortDateTime } from '@/lib/datetime';
import type { ClinicalAccessTrailEntry } from '@/types/clinical-access';
import type { Paginated } from '@/types/pagination';
import { CLINICAL_ACCESS_TRAIL_ID } from './clinical-access-trail';

type ClinicalAccessTrailCardProps = {
    trail: Paginated<ClinicalAccessTrailEntry>;
    onPageChange: (page: number) => void;
};

// Who read, wrote, amended, annulled or exported this patient's clinical
// history in the practice, newest first (#325, ADR 0022). Rendered only next
// to the history it records, for whoever can read it.
export function ClinicalAccessTrailCard({
    trail,
    onPageChange,
}: ClinicalAccessTrailCardProps) {
    return (
        <Card id={CLINICAL_ACCESS_TRAIL_ID} className="scroll-mt-6">
            <CardHeader>
                <CardTitle>Registro de accesos</CardTitle>
                <CardDescription>
                    Quién leyó, escribió, enmendó, anuló o exportó esta historia
                    clínica, y cuándo.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {trail.meta.total === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay accesos registrados.
                    </p>
                ) : trail.data.length === 0 ? (
                    // A page past the end: a link kept from when it existed.
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm text-muted-foreground">
                            Esta página del registro no existe.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(1)}
                        >
                            Ver los más recientes
                        </Button>
                    </div>
                ) : (
                    <ul className="divide-y">
                        {trail.data.map((entry) => (
                            <li
                                key={entry.id}
                                className="space-y-0.5 py-2.5 first:pt-0 last:pb-0"
                            >
                                <p className="font-medium">
                                    {describeTrailEntry(entry)}
                                </p>
                                <p className="flex flex-wrap gap-x-1.5 text-muted-foreground">
                                    <span>
                                        {entry.professional.name ?? '—'}
                                    </span>
                                    <span aria-hidden>·</span>
                                    <span className="tabular-nums">
                                        {formatShortDateTime(entry.created_at)}
                                    </span>
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
                <DataTablePagination
                    currentPage={trail.meta.current_page}
                    lastPage={trail.meta.last_page}
                    total={trail.meta.total}
                    label="accesos"
                    onPageChange={onPageChange}
                />
            </CardContent>
        </Card>
    );
}
