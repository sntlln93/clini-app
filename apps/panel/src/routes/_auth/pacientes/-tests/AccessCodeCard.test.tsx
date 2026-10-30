import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ACCESS_CODE_DESCRIPTION,
    AccessCodeCard,
} from '../-components/AccessCodeCard';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

function renderCard(queryClient = new QueryClient()) {
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const detailRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes/$id',
        component: () => <AccessCodeCard patientId={10} />,
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([detailRoute]),
        history: createMemoryHistory({ initialEntries: ['/pacientes/10'] }),
    });
    render(<RouterProvider router={router} />);
}

async function submit(code: string) {
    fireEvent.change(
        await screen.findByRole('textbox', { name: 'Código del paciente' }),
        { target: { value: code } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ver registros' }));
}

// #364: another professional's records open with the code the patient shares.
describe('AccessCodeCard', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
    });

    it('explains where the patient finds the code', async () => {
        renderCard();

        await screen.findByText(ACCESS_CODE_DESCRIPTION);
        expect(ACCESS_CODE_DESCRIPTION).toContain('link de su turno');
    });

    it('asks for a code before sending anything', async () => {
        renderCard();
        await submit('   ');

        await screen.findByText('Ingresá el código del paciente.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('redeems the code and reloads the patient and its whole history', async () => {
        const queryClient = new QueryClient();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: {} } });
        renderCard(queryClient);
        await submit(' abcd-2345 ');

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/patients/10/access-code-redemptions',
                { code: 'abcd-2345' },
            ),
        );
        await waitFor(() =>
            expect(
                invalidate.mock.calls.map(([filters]) => filters?.queryKey),
            ).toEqual([
                ['patients', 10],
                ['patients', 10, 'clinical-notes'],
                ['prescriptions', 'patient', 10],
                ['patients', 10, 'vital-signs'],
                ['patients', 10, 'medical-history'],
            ]),
        );
    });

    it('shows a refused code on the field', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'clinical_access.code_invalid',
                        message: 'The access code is not valid.',
                        context: {},
                    },
                },
            },
        });
        renderCard();
        await submit('ZZZZ-ZZZZ');

        const field = await screen.findByRole('textbox', {
            name: 'Código del paciente',
        });
        await screen.findByText(/El código no es válido, ya se usó o venció/);
        expect(field.getAttribute('aria-invalid')).toBe('true');
    });
});
