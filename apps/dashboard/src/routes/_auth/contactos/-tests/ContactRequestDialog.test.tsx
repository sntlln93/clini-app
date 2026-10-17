import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import { expectNoA11yViolations } from '@/tests/a11y';
import { renderRoute } from '@/tests/render-route';
import type { AdminContactRequest } from '@/types/contact-request';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContactRequestDialog } from '../-components/ContactRequestDialog';

const refresh = vi.fn(() => Promise.resolve());

vi.mock('@/lib/api', () => ({ api: { put: vi.fn() } }));
vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));

const REQUEST: AdminContactRequest = {
    id: 7,
    name: 'Laura Gómez',
    email: 'laura@centro.test',
    phone: '11 5555-0000',
    organization_name: 'Centro Médico Norte',
    team_size: 12,
    plan: 'center',
    message: 'Somos 12 profesionales.\nQueremos migrar la agenda.',
    status: 'new',
    handled_by: null,
    closed_at: null,
    created_at: '2026-10-17T12:00:00+00:00',
    updated_at: '2026-10-17T12:00:00+00:00',
};

async function open(
    request: Partial<AdminContactRequest> = {},
    isListed: (status: string) => boolean = () => true,
) {
    const fallbackFocus = { current: null as HTMLElement | null };
    const result = await renderRoute(
        <>
            <h1
                ref={(node) => void (fallbackFocus.current = node)}
                tabIndex={-1}
            >
                Contactos
            </h1>
            <ContactRequestDialog
                contactRequest={{ ...REQUEST, ...request }}
                isListed={isListed}
                fallbackFocus={fallbackFocus}
            />
        </>,
        { path: '/contactos' },
    );
    fireEvent.click(
        screen.getByRole('button', { name: 'Ver la consulta de Laura Gómez' }),
    );

    return { ...result, dialog: await screen.findByRole('dialog') };
}

describe('ContactRequestDialog', () => {
    it('shows the whole request, with links to answer by mail or phone', async () => {
        const { dialog } = await open();

        expect(
            within(dialog).getByRole('heading', {
                name: 'Consulta de Laura Gómez',
            }),
        ).toBeTruthy();
        expect(
            within(dialog)
                .getByRole('link', { name: 'laura@centro.test' })
                .getAttribute('href'),
        ).toBe('mailto:laura@centro.test');
        expect(
            within(dialog)
                .getByRole('link', { name: '11 5555-0000' })
                .getAttribute('href'),
        ).toBe('tel:11 5555-0000');
        expect(within(dialog).getByText('Centro Médico Norte')).toBeTruthy();
        expect(within(dialog).getByText('Centro')).toBeTruthy();
        expect(within(dialog).getByText('Nueva')).toBeTruthy();
        expect(
            within(dialog).getByText(/Queremos migrar la agenda\./),
        ).toBeTruthy();
    });

    it('shows a dash for what the visitor left out', async () => {
        const { dialog } = await open({
            phone: null,
            organization_name: null,
            team_size: null,
            plan: null,
        });

        expect(within(dialog).getAllByText('—')).toHaveLength(3);
        expect(within(dialog).getByText('Sin definir')).toBeTruthy();
    });

    it.each([
        ['new', ['Marcar en curso', 'Cerrar']],
        ['in_progress', ['Volver a nueva', 'Cerrar']],
        ['closed', ['Reabrir']],
    ] as const)('offers the moves out of %s', async (status, expected) => {
        const { dialog } = await open({ status });
        const footerButtons = within(dialog)
            .getAllByRole('button')
            .map((button) => button.textContent)
            .filter((label) => label !== 'Close');

        expect(footerButtons).toEqual(expected);
    });

    it('changes the status, refreshes the list and the audit log, and closes', async () => {
        vi.mocked(api.put).mockResolvedValueOnce({
            data: { data: { ...REQUEST, status: 'in_progress' } },
        });
        const { dialog } = await open();

        fireEvent.click(
            within(dialog).getByRole('button', { name: 'Marcar en curso' }),
        );

        await waitFor(() =>
            expect(api.put).toHaveBeenCalledWith(
                '/admin/contact-requests/7/status',
                { status: 'in_progress' },
            ),
        );
        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith(
                'Consulta marcada como «en curso»',
            ),
        );
        expect(refresh).toHaveBeenCalledWith(
            ['contact-requests'],
            ['audit-logs'],
        );
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('returns focus to its trigger when the request stays on the list', async () => {
        vi.mocked(api.put).mockResolvedValueOnce({
            data: { data: { ...REQUEST, status: 'closed' } },
        });
        const { dialog } = await open();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        await waitFor(() =>
            expect(document.activeElement).toBe(
                screen.getByRole('button', {
                    name: 'Ver la consulta de Laura Gómez',
                }),
            ),
        );
    });

    it('closes before the refresh and moves focus to the page title when the request leaves the filtered list', async () => {
        let finishRefresh = () => {};
        refresh.mockImplementationOnce(
            () => new Promise<void>((resolve) => (finishRefresh = resolve)),
        );
        vi.mocked(api.put).mockResolvedValueOnce({
            data: { data: { ...REQUEST, status: 'in_progress' } },
        });
        const { dialog } = await open({}, (status) => status === 'new');

        fireEvent.click(
            within(dialog).getByRole('button', { name: 'Marcar en curso' }),
        );

        // Still refreshing: the row (and this dialog's trigger) is about to go.
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        await waitFor(() =>
            expect(document.activeElement).toBe(
                screen.getByRole('heading', { name: 'Contactos' }),
            ),
        );
        finishRefresh();
    });

    it('reports a failed change and stays open', async () => {
        const error = {
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'contact_requests.status_unchanged',
                        message: 'x',
                        context: {},
                    },
                },
            },
        };
        vi.mocked(api.put).mockRejectedValueOnce(error);
        const { dialog } = await open({ status: 'closed' });

        fireEvent.click(
            within(dialog).getByRole('button', { name: 'Reabrir' }),
        );

        await waitFor(() =>
            expect(notifyError).toHaveBeenCalledWith(
                error,
                'No pudimos cambiar el estado de la consulta.',
            ),
        );
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('has no accessibility violations', async () => {
        await open();

        await expectNoA11yViolations(document.body);
    });
});
