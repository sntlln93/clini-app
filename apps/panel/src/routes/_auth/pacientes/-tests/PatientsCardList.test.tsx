import { api } from '@/lib/api';
import { buildPatient } from '@/tests/fixtures/patient';
import { stubIntersectionObserver } from '@/tests/intersection-observer';
import { renderInRouter } from '@/tests/render-in-router';
import type { Paginated } from '@/types/pagination';
import type { Patient } from '@/types/patient';
import { QueryClient } from '@tanstack/react-query';
import { act, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PatientsCardList } from '../-components/PatientsCardList';
import { patientCardsQueryOptions } from '../-hooks/use-patients';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

function page(
    patients: Patient[],
    current_page: number,
    last_page: number,
): Paginated<Patient> {
    return {
        data: patients,
        meta: { current_page, last_page, per_page: 24, total: 3 },
        links: { first: null, last: null, prev: null, next: null },
    };
}

// What the route's loader leaves in the cache before the list mounts.
function cachedFirstPage(firstPage: Paginated<Patient>) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(patientCardsQueryOptions({ q: '' }).queryKey, {
        pages: [firstPage],
        pageParams: [1],
    });

    return queryClient;
}

describe('PatientsCardList', () => {
    it('shows the first page as cards and loads the next one at the end of the list', async () => {
        const observer = stubIntersectionObserver();
        const queryClient = cachedFirstPage(
            page(
                [
                    buildPatient({ id: 1, name: 'Ana Gómez' }),
                    buildPatient({ id: 2, name: 'Bruno Díaz' }),
                ],
                1,
                2,
            ),
        );
        vi.mocked(api.get).mockResolvedValueOnce({
            data: page([buildPatient({ id: 3, name: 'Carla Ruiz' })], 2, 2),
        });
        renderInRouter(
            <PatientsCardList q="" empty={<p>Vacío</p>} />,
            queryClient,
        );

        const list = await screen.findByRole('list', { name: 'Pacientes' });
        expect(within(list).getAllByRole('listitem')).toHaveLength(2);
        screen.getByText('Mostrando 2 de 3 pacientes');

        act(() => observer.intersect());

        await screen.findByRole('link', { name: 'Carla Ruiz' });
        expect(api.get).toHaveBeenCalledWith('/patients', {
            params: { q: undefined, page: 2, per_page: 12 },
        });
        screen.getByText('Mostrando 3 de 3 pacientes');
        expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
    });

    it('shows the empty state when there is no patient', async () => {
        stubIntersectionObserver();
        renderInRouter(
            <PatientsCardList q="" empty={<p>Vacío</p>} />,
            cachedFirstPage(page([], 1, 1)),
        );

        await screen.findByText('Vacío');
        expect(screen.queryByRole('list')).toBeNull();
    });
});
