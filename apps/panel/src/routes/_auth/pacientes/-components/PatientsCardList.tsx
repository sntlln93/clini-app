import { CardGrid } from '@/features/list-view/CardGrid';
import { InfiniteListFooter } from '@/features/list-view/InfiniteListFooter';
import { flattenPages } from '@/features/list-view/list-view';
import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { patientCardsQueryOptions } from '../-hooks/use-patients';
import { PatientCard } from './PatientCard';

type PatientsCardListProps = {
    q: string;
    empty: ReactNode;
};

// Its first page comes from the route's loader; the next ones are reads the
// user triggers by scrolling (ADR 0007).
export function PatientsCardList({ q, empty }: PatientsCardListProps) {
    const query = useSuspenseInfiniteQuery(patientCardsQueryOptions({ q }));
    const patients = flattenPages(query.data.pages);

    if (patients.length === 0) {
        return empty;
    }

    return (
        <div className="space-y-6">
            <CardGrid label="Pacientes">
                {patients.map((patient) => (
                    <PatientCard key={patient.id} patient={patient} />
                ))}
            </CardGrid>
            <InfiniteListFooter
                loaded={patients.length}
                total={query.data.pages.at(-1)?.meta.total ?? patients.length}
                noun="pacientes"
                hasNextPage={query.hasNextPage}
                isFetchingNextPage={query.isFetchingNextPage}
                isFetchNextPageError={query.isFetchNextPageError}
                fetchNextPage={query.fetchNextPage}
            />
        </div>
    );
}
