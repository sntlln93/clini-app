import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { renderRoute } from '@/tests/render-route';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VerifyEmailDialog } from '../-components/VerifyEmailDialog';

const refresh = vi.fn(() => Promise.resolve());

vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }));
vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));

describe('VerifyEmailDialog', () => {
    it('is hidden when the email is already verified', async () => {
        await renderRoute(
            <VerifyEmailDialog
                userId={4}
                email="ana@clini.app"
                emailVerifiedAt="2026-09-01T12:00:00+00:00"
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Verificar correo' }),
        ).toBeNull();
    });

    it('verifies an unverified email after confirming', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: {} } });
        await renderRoute(
            <VerifyEmailDialog
                userId={4}
                email="ana@clini.app"
                emailVerifiedAt={null}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Verificar correo' }),
        );
        await screen.findByText(/Vas a marcar ana@clini.app como verificado/);
        fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/admin/users/4/email-verification',
            ),
        );
        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith('Correo verificado'),
        );
        expect(refresh).toHaveBeenCalledWith(
            ['users'],
            ['organizations'],
            ['audit-logs'],
            ['overview'],
        );
    });
});
