import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteMemberDialog } from '../-components/InviteMemberDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

function unauthorizedError(data: unknown) {
    return { isAxiosError: true, response: { status: 422, data } };
}

function renderInviteMemberDialog() {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <InviteMemberDialog />
        </QueryClientProvider>,
    );
}

async function openDialog() {
    fireEvent.click(
        await screen.findByRole('button', { name: 'Invitar miembro' }),
    );
    await screen.findByLabelText('Correo electrónico');
}

describe('InviteMemberDialog', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
    });

    it('calls the invite mutation with exactly the email and selected roles, no organization_id', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { message: 'Invitación enviada.' },
        });
        renderInviteMemberDialog();
        await openDialog();

        fireEvent.change(screen.getByLabelText('Correo electrónico'), {
            target: { value: 'nuevo@clini.app' },
        });
        fireEvent.click(screen.getByRole('checkbox', { name: 'Profesional' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Enviar invitación' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/memberships/invitations', {
                email: 'nuevo@clini.app',
                roles: ['professional'],
            }),
        );
    });

    it('renders the backend Spanish field errors from a 422 response', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            unauthorizedError({
                message: 'Los datos ingresados no son válidos.',
                errors: {
                    email: ['Ese correo ya tiene una invitación pendiente.'],
                    roles: ['Debe seleccionar al menos un rol.'],
                },
            }),
        );
        renderInviteMemberDialog();
        await openDialog();

        fireEvent.change(screen.getByLabelText('Correo electrónico'), {
            target: { value: 'nuevo@clini.app' },
        });
        fireEvent.click(screen.getByRole('checkbox', { name: 'Profesional' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Enviar invitación' }),
        );

        await screen.findByText(
            'Ese correo ya tiene una invitación pendiente.',
        );
        screen.getByText('Debe seleccionar al menos un rol.');
    });
});
