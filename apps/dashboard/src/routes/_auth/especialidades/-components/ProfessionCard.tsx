import { StatusPill } from '@/components/StatusPill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import { healthProfessionLabel } from '@/lib/health-professions';
import { LICENSE_MISMATCH_LABELS } from '@/lib/labels';
import {
    LICENSE_MISMATCH_REASONS,
    type CatalogProfession,
} from '@/types/specialty';
import { SpecialtiesTable } from './SpecialtiesTable';

/** A profession's licenses by registry answer, and its specialties. */
export function ProfessionCard({
    profession,
}: {
    profession: CatalogProfession;
}) {
    const { licenses } = profession;
    const reasons = LICENSE_MISMATCH_REASONS.filter(
        (reason) => licenses.mismatch_reasons[reason] > 0,
    );

    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>
                    {healthProfessionLabel(profession.profession)}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Matrículas sumadas a Clini
                    </p>
                    <ul className="flex flex-wrap gap-2">
                        <li>
                            <StatusPill tone="success">
                                {formatNumber(licenses.verified)} verificadas
                            </StatusPill>
                        </li>
                        <li>
                            <StatusPill tone="neutral">
                                {formatNumber(licenses.unverified)} sin
                                verificar
                            </StatusPill>
                        </li>
                        <li>
                            <StatusPill tone="danger">
                                {formatNumber(licenses.mismatch)} no coinciden
                            </StatusPill>
                        </li>
                    </ul>
                    {reasons.length > 0 && (
                        <ul
                            aria-label="Motivos por los que no coinciden"
                            className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"
                        >
                            {reasons.map((reason) => (
                                <li key={reason}>
                                    {LICENSE_MISMATCH_LABELS[reason]}:{' '}
                                    {formatNumber(
                                        licenses.mismatch_reasons[reason],
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <SpecialtiesTable specialties={profession.specialties} />
            </CardContent>
        </Card>
    );
}
