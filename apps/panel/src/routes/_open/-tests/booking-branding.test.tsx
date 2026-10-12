import { api } from '@/lib/api';
import type {
    BookingOrganization,
    BookingOrganizationResponse,
} from '@/types/booking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRouteWithContext,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MadeWithClini } from '../-components/booking/BookingBranding';
import { Route as OpenRouteImport } from '../../_open';
import { Route as BookingRouteImport } from '../reservar.$slug';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
    refreshCsrfCookie: vi.fn(),
}));

const landing = vi.hoisted(() => ({ url: null as string | null }));
vi.mock('@/lib/landing', () => ({
    get LANDING_URL() {
        return landing.url;
    },
}));

const LOGO_URL =
    'http://localhost:8080/api/v1/booking/consultorio-salud/logo?v=abc';

function bookingResponse(
    branding: Pick<BookingOrganization, 'show_clini_mark' | 'logo_url'>,
): BookingOrganizationResponse {
    return {
        organization: {
            name: 'Consultorio Salud',
            slug: 'consultorio-salud',
            timezone: 'UTC',
            ...branding,
        },
        professionals: [],
        preselected_membership_id: null,
        insurance_providers: [],
    };
}

// The real `_open` layout and booking page, assembled like routeTree.gen.ts.
async function renderBookingPage(response: BookingOrganizationResponse) {
    vi.mocked(api.get).mockResolvedValue({ data: response });
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const rootRoute = createRootRouteWithContext<{
        queryClient: QueryClient;
    }>()({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    /* eslint-disable @typescript-eslint/no-explicit-any -- mirrors routeTree.gen.ts's own `.update()` calls */
    const openRoute = OpenRouteImport.update({
        id: '/_open',
        getParentRoute: () => rootRoute,
    } as any);
    const bookingRoute = BookingRouteImport.update({
        id: '/reservar/$slug',
        path: '/reservar/$slug',
        getParentRoute: () => openRoute,
    } as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const router = createRouter({
        routeTree: rootRoute.addChildren([
            openRoute.addChildren([bookingRoute]),
        ]),
        context: { queryClient },
        history: createMemoryHistory({
            initialEntries: ['/reservar/consultorio-salud'],
        }),
    });

    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Reservar turno' });
}

describe('booking page branding (#239)', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        landing.url = null;
    });

    it('shows «Hecho con Clini» and no logo on Free', async () => {
        await renderBookingPage(
            bookingResponse({ show_clini_mark: true, logo_url: null }),
        );

        expect(screen.getByText(/Hecho con/)).not.toBeNull();
        expect(screen.queryByRole('img')).toBeNull();
    });

    it('shows the organization logo and no Clini mark on a paid plan with a logo', async () => {
        await renderBookingPage(
            bookingResponse({ show_clini_mark: false, logo_url: LOGO_URL }),
        );

        const logo = screen.getByRole('img', { name: 'Consultorio Salud' });
        expect(logo.getAttribute('src')).toBe(LOGO_URL);
        expect(screen.queryByText(/Hecho con/)).toBeNull();
    });

    it('shows neither on a paid plan without a logo', async () => {
        await renderBookingPage(
            bookingResponse({ show_clini_mark: false, logo_url: null }),
        );

        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.queryByText(/Hecho con/)).toBeNull();
    });
});

describe('MadeWithClini', () => {
    beforeEach(() => {
        landing.url = null;
    });

    it('links to the landing when its URL is configured', () => {
        landing.url = 'https://clini.ar';
        render(<MadeWithClini />);

        const link = screen.getByRole('link', { name: 'Clini' });
        expect(link.getAttribute('href')).toBe('https://clini.ar');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('renders plain text without a landing URL', () => {
        render(<MadeWithClini />);

        expect(screen.getByText('Clini')).not.toBeNull();
        expect(screen.queryByRole('link')).toBeNull();
    });
});
