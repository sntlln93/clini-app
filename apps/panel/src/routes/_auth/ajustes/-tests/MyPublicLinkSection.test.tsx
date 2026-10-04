import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { Membership } from '@/types/membership';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyPublicLinkSection } from '../-components/MyPublicLinkSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

const SAVED_URL = `${window.location.origin}/reservar/dra-lopez`;

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

function membershipWithSlug(slug: string | null): Membership {
    return {
        id: 5,
        user: { id: 1, name: 'Dra. Lopez', email: 'dra.lopez@example.com' },
        roles: ['professional'],
        status: 'active',
        slug,
        deleted_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

function renderSection(membership: Membership) {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <MyPublicLinkSection membership={membership} />
        </QueryClientProvider>,
    );
}

describe('MyPublicLinkSection', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
        vi.mocked(notifySuccess).mockReset();
        vi.mocked(notifyError).mockReset();
        invalidate.mockReset();
    });

    it("exposes the slug input with accessible name 'Link'", () => {
        renderSection(membershipWithSlug('dra-lopez'));

        expect(screen.getByRole('textbox', { name: 'Link' })).not.toBeNull();
    });

    it('typing into the field found by its label updates the value', () => {
        renderSection(membershipWithSlug(null));

        fireEvent.change(screen.getByLabelText('Link'), {
            target: { value: 'nuevo-slug' },
        });

        expect((screen.getByLabelText('Link') as HTMLInputElement).value).toBe(
            'nuevo-slug',
        );
    });

    it('renders the input prefilled with the current slug and the saved link', () => {
        renderSection(membershipWithSlug('dra-lopez'));

        expect((screen.getByLabelText('Link') as HTMLInputElement).value).toBe(
            'dra-lopez',
        );
        expect(screen.getByText(SAVED_URL)).toBeTruthy();
        expect(screen.queryByText(/Vista previa/)).toBeNull();
    });

    it('renders no saved link or preview when the slug is empty or null', () => {
        renderSection(membershipWithSlug(null));

        expect((screen.getByLabelText('Link') as HTMLInputElement).value).toBe(
            '',
        );
        expect(screen.queryByText(/Tu link/)).toBeNull();
        expect(screen.queryByText(/Vista previa/)).toBeNull();
        expect(
            screen.queryByRole('button', { name: /Copiar link/ }),
        ).toBeNull();
    });

    it('shows the /reservar/ prefix next to the input', () => {
        renderSection(membershipWithSlug(null));

        screen.getByText(`${window.location.host}/reservar/`);
    });

    it('labels a typed, unsaved slug as a preview and keeps the saved link apart', () => {
        renderSection(membershipWithSlug('dra-lopez'));

        fireEvent.change(screen.getByLabelText('Link'), {
            target: { value: 'otro-slug' },
        });

        screen.getByText(
            `Vista previa (sin guardar): ${window.location.origin}/reservar/otro-slug`,
        );
        expect(screen.getByText(SAVED_URL)).toBeTruthy();
    });

    it('warns that saving an emptied field removes the saved link', () => {
        renderSection(membershipWithSlug('dra-lopez'));

        fireEvent.change(screen.getByLabelText('Link'), {
            target: { value: '' },
        });

        screen.getByText(/se elimina tu link público/);
    });

    it('disables Guardar until the slug differs from the saved one', () => {
        renderSection(membershipWithSlug('dra-lopez'));
        const save = screen.getByRole('button', { name: 'Guardar' });

        expect(save).toHaveProperty('disabled', true);

        fireEvent.change(screen.getByLabelText('Link'), {
            target: { value: 'otro-slug' },
        });
        expect(save).toHaveProperty('disabled', false);

        fireEvent.change(screen.getByLabelText('Link'), {
            target: { value: ' dra-lopez ' },
        });
        expect(save).toHaveProperty('disabled', true);
    });

    it('copies the saved link and confirms it with a toast', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        renderSection(membershipWithSlug('dra-lopez'));

        fireEvent.change(screen.getByLabelText('Link'), {
            target: { value: 'sin-guardar' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Copiar link/ }));

        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith('Link copiado'),
        );
        expect(writeText).toHaveBeenCalledWith(SAVED_URL);
    });

    it('reports a failed copy with an error toast', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: vi.fn().mockRejectedValue(new Error('denied')),
            },
            configurable: true,
        });
        renderSection(membershipWithSlug('dra-lopez'));

        fireEvent.click(screen.getByRole('button', { name: /Copiar link/ }));

        await waitFor(() =>
            expect(notifyError).toHaveBeenCalledWith(
                expect.any(Error),
                'No se pudo copiar el link',
            ),
        );
    });

    it('opens the saved link in a new tab', () => {
        renderSection(membershipWithSlug('dra-lopez'));

        const open = screen.getByRole('link', { name: /Abrir/ });
        expect(open.getAttribute('href')).toBe(SAVED_URL);
        expect(open.getAttribute('target')).toBe('_blank');
    });

    it('submits the typed slug via PATCH /memberships/me/slug', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderSection(membershipWithSlug(null));

        fireEvent.change(screen.getByLabelText('Link'), {
            target: { value: 'nuevo-slug' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/memberships/me/slug', {
                slug: 'nuevo-slug',
            }),
        );
    });

    it('clearing the input and submitting sends a null slug', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderSection(membershipWithSlug('dra-lopez'));

        fireEvent.change(screen.getByLabelText('Link'), {
            target: { value: '' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/memberships/me/slug', {
                slug: null,
            }),
        );
    });
});
