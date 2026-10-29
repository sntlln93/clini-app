import { CardGrid } from '@/features/list-view/CardGrid';
import { InfiniteListFooter } from '@/features/list-view/InfiniteListFooter';
import { flattenPages } from '@/features/list-view/list-view';
import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { membershipCardsQueryOptions } from '../-hooks/use-memberships';
import { MemberCard } from './MemberCard';

type MembersCardListProps = {
    q: string;
    empty: ReactNode;
};

// Its first page comes from the route's loader; the next ones are reads the
// user triggers by scrolling (ADR 0007).
export function MembersCardList({ q, empty }: MembersCardListProps) {
    const query = useSuspenseInfiniteQuery(membershipCardsQueryOptions({ q }));
    const memberships = flattenPages(query.data.pages);

    if (memberships.length === 0) {
        return empty;
    }

    return (
        <div className="space-y-6">
            <CardGrid label="Miembros">
                {memberships.map((membership) => (
                    <MemberCard key={membership.id} membership={membership} />
                ))}
            </CardGrid>
            <InfiniteListFooter
                loaded={memberships.length}
                total={
                    query.data.pages.at(-1)?.meta.total ?? memberships.length
                }
                noun="miembros"
                hasNextPage={query.hasNextPage}
                isFetchingNextPage={query.isFetchingNextPage}
                isFetchNextPageError={query.isFetchNextPageError}
                fetchNextPage={query.fetchNextPage}
            />
        </div>
    );
}
