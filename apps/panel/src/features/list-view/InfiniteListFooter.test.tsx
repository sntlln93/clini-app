import { stubIntersectionObserver } from '@/tests/intersection-observer';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { InfiniteListFooter } from './InfiniteListFooter';

function renderFooter(
    props: Partial<ComponentProps<typeof InfiniteListFooter>> = {},
) {
    const fetchNextPage = vi.fn();
    render(
        <InfiniteListFooter
            loaded={24}
            total={30}
            noun="pacientes"
            hasNextPage
            isFetchingNextPage={false}
            isFetchNextPageError={false}
            fetchNextPage={fetchNextPage}
            {...props}
        />,
    );

    return fetchNextPage;
}

describe('InfiniteListFooter', () => {
    it('says how much of the list is shown', () => {
        stubIntersectionObserver();
        renderFooter();

        screen.getByText('Mostrando 24 de 30 pacientes');
    });

    it('loads the next page once the end of the list comes into view', () => {
        const observer = stubIntersectionObserver();
        const fetchNextPage = renderFooter();

        act(() => observer.intersect());

        expect(fetchNextPage).toHaveBeenCalledOnce();
    });

    it('loads the next page from its button, for whoever does not scroll', () => {
        stubIntersectionObserver();
        const fetchNextPage = renderFooter();

        fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }));

        expect(fetchNextPage).toHaveBeenCalledOnce();
    });

    it('does not watch the end while a page is loading or once the list is complete', () => {
        const loading = stubIntersectionObserver();
        renderFooter({ isFetchingNextPage: true });
        expect(loading.live()).toHaveLength(0);
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('stays put after a failed page instead of asking again, and offers to retry', () => {
        const observer = stubIntersectionObserver();
        const fetchNextPage = renderFooter({ isFetchNextPageError: true });

        act(() => observer.intersect());
        expect(fetchNextPage).not.toHaveBeenCalled();

        screen.getByText('No se pudieron cargar más pacientes.');
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        expect(fetchNextPage).toHaveBeenCalledOnce();
    });

    it('offers nothing more once every page is loaded', () => {
        const observer = stubIntersectionObserver();
        renderFooter({ hasNextPage: false, loaded: 30 });

        expect(observer.live()).toHaveLength(0);
        expect(screen.queryByRole('button')).toBeNull();
        screen.getByText('Mostrando 30 de 30 pacientes');
    });
});
