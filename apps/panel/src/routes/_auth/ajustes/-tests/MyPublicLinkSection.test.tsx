import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyPublicLinkSection } from '../-components/MyPublicLinkSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

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
        invalidate.mockReset();
    });

    it('renders the input prefilled with the current slug and a link preview', () => {
        renderSection(membershipWithSlug('dra-lopez'));

        expect((screen.getByLabelText('Link') as HTMLInputElement).value).toBe(
            'dra-lopez',
        );
        expect(screen.getByText(/\/reservar\/dra-lopez/)).toBeTruthy();
    });

    it('renders no link preview when the slug is empty or null', () => {
        renderSection(membershipWithSlug(null));

        expect((screen.getByLabelText('Link') as HTMLInputElement).value).toBe(
            '',
        );
        expect(screen.queryByText(/\/reservar\//)).toBeNull();
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
