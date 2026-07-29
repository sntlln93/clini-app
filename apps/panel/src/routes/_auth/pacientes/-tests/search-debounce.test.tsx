import { api } from '@/lib/api';
import type { Paginated, Patient } from '@/types/patient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRouteWithContext,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as PacientesRoute } from '../index';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

// Builds a minimal router carrying the real `/pacientes` route (its loader,
// `pendingMs`, `validateSearch` and component all untouched) as the only
// child of a bare root — the auth-guarded `_auth` layout is irrelevant to
// this behaviour and would only add an unrelated session mock. `.update()`
// is the same mechanism the generated `routeTree.gen.ts` uses to wire this
// route's real `id`/`path`/parent; it is not test-only plumbing.
function renderPacientesRoute(initialUrl: string) {
    const rootRoute = createRootRouteWithContext<{
        queryClient: QueryClient;
    }>()({ component: () => <Outlet /> });
    // Cast to `any`, same as the generated `routeTree.gen.ts` does for every
    // route's own `.update()` call — `UpdatableRouteOptions` doesn't type
    // `id`/`path`/`getParentRoute` as settable post-construction, even
    // though this is exactly how the file-based router wires each route.
    const route = PacientesRoute.update({
        id: '/pacientes/',
        path: '/pacientes/',
        getParentRoute: () => rootRoute,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same cast the generated routeTree.gen.ts uses for its own `.update()` calls
    } as any);
    const routeTree = rootRoute.addChildren([route]);
    const queryClient = new QueryClient();
    const router = createRouter({
        routeTree,
        context: { queryClient },
        history: createMemoryHistory({ initialEntries: [initialUrl] }),
    });

    render(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );

    return { router };
}

const PATIENT: Patient = {
    id: 1,
    name: 'Ana Gomez',
    email: null,
    phone: null,
    document_type: 'dni',
    document_number: '12345678',
    sex: null,
    birth_date: null,
    insurance_provider_id: null,
    insurance_provider: null,
    created_at: '2026-01-01T00:00:00Z',
};

function patientsPage(): Paginated<Patient> {
    return {
        data: [PATIENT],
        meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
        links: { first: null, last: null, prev: null, next: null },
    };
}

function mockApiGet() {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/patients') {
            return Promise.resolve({ data: patientsPage() });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

describe('/pacientes search debounce', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGet();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('updates the input immediately but only navigates once the debounce elapses', async () => {
        const { router } = renderPacientesRoute('/pacientes/');
        const input = (await screen.findByPlaceholderText(
            'Buscar por nombre o documento…',
        )) as HTMLInputElement;
        input.focus();

        vi.useFakeTimers();
        const navigateSpy = vi.spyOn(router, 'navigate');

        fireEvent.change(input, { target: { value: 'ana' } });

        // Displayed value and focus update in the same tick — no remount.
        expect(input.value).toBe('ana');
        expect(document.activeElement).toBe(input);
        expect(navigateSpy).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(299);
        expect(navigateSpy).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);

        expect(navigateSpy).toHaveBeenCalledTimes(1);
        expect(router.state.location.search).toMatchObject({
            q: 'ana',
            page: 1,
        });
    });

    it('reflects an external `q` change (clear button / browser back) in the input', async () => {
        const { router } = renderPacientesRoute('/pacientes/?q=ana');
        await screen.findByDisplayValue('ana');

        // Cast to `any`: the app's global `Register` (declared in
        // `main.tsx`) types every router's `navigate()` against the real
        // route tree, which this test's standalone router deliberately
        // does not match.
        await router.navigate({
            to: '/pacientes/',
            search: { q: '', page: 1 },
            replace: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
        } as any);

        await screen.findByDisplayValue('');
    });
});
