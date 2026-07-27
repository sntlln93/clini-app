import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberEditDialog } from '../-components/MemberEditDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

function unauthorizedError(data: unknown) {
    return { isAxiosError: true, response: { status: 422, data } };
}

const MEMBERSHIP: Membership = {
    id: 5,
    user: { id: 5, name: 'Ana Gomez', email: 'ana@clini.app' },
    roles: ['owner', 'admin'],
    status: 'suspended',
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

function renderMemberEditDialog(membership: Membership | null) {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <MemberEditDialog membership={membership} onClose={vi.fn()} />
        </QueryClientProvider>,
    );
}

describe('MemberEditDialog', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
    });

    it('opens prefilled with the current roles and status', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({
            data: { data: MEMBERSHIP },
        });
        renderMemberEditDialog(MEMBERSHIP);

        await screen.findByText('Editar membresía');

        expect(
            screen
                .getByRole('checkbox', { name: 'Propietario' })
                .getAttribute('aria-checked'),
        ).toBe('true');
        expect(
            screen
                .getByRole('checkbox', { name: 'Administrador' })
                .getAttribute('aria-checked'),
        ).toBe('true');
        expect(
            screen
                .getByRole('checkbox', { name: 'Profesional' })
                .getAttribute('aria-checked'),
        ).toBe('false');
        expect(
            screen
                .getByRole('checkbox', { name: 'Personal' })
                .getAttribute('aria-checked'),
        ).toBe('false');

        // Submitting untouched proves the status select was prefilled to the
        // membership's current status (its displayed label isn't a reliable
        // assertion target: the underlying Select only resolves a value to
        // its Spanish label once its listbox has been opened at least once).
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/memberships/5', {
                roles: ['owner', 'admin'],
                status: 'suspended',
            }),
        );
    });

    it('sends the selected roles and status to the update mutation', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({
            data: {
                data: { ...MEMBERSHIP, roles: ['admin'], status: 'active' },
            },
        });
        renderMemberEditDialog(MEMBERSHIP);

        await screen.findByText('Editar membresía');

        fireEvent.click(screen.getByLabelText('Estado'));
        const activeOption = await screen.findByRole('option', {
            name: 'Activo',
        });
        // The status select already has a value selected (`Suspendido`), so
        // a bare `click` doesn't register as a selection in jsdom — it needs
        // the full pointer sequence a real browser would generate.
        fireEvent.pointerDown(activeOption);
        fireEvent.pointerUp(activeOption);
        fireEvent.click(activeOption);

        fireEvent.click(screen.getByRole('checkbox', { name: 'Propietario' }));

        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/memberships/5', {
                roles: ['admin'],
                status: 'active',
            }),
        );
    });

    it('renders the backend Spanish message from a 422 guard response', async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(
            unauthorizedError({
                message:
                    'No podés dejar a la organización sin propietarios activos.',
                errors: {},
            }),
        );
        renderMemberEditDialog(MEMBERSHIP);

        await screen.findByText('Editar membresía');
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        await screen.findByText(
            'No podés dejar a la organización sin propietarios activos.',
        );
    });
});
