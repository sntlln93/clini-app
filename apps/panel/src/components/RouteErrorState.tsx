import { QueryErrorState } from '@/components/QueryErrorState';
import type { ErrorComponentProps } from '@tanstack/react-router';

/**
 * Shared `errorComponent` for routes whose loader failed to resolve a page
 * read. Reuses `QueryErrorState`'s presentation — no new visual design.
 */
export function RouteErrorState({ error }: ErrorComponentProps) {
    return <QueryErrorState error={error} />;
}
