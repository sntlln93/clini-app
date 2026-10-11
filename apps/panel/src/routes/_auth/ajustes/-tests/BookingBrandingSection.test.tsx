import { api } from '@/lib/api';
import { planQueryOptions } from '@/lib/plan';
import { notifySuccess } from '@/lib/toast';
import { buildPlan } from '@/tests/fixtures/plan';
import type { OrganizationLogo } from '@/types/organization';
import type { PlanId } from '@/types/plan';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingBrandingSection } from '../-components/BookingBrandingSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return {
        ...actual,
        useRouter: () => ({ invalidate }),
        // PlanFeatureNote's link to Ajustes, rendered outside a router here.
        Link: ({ children, to }: { children: ReactNode; to: string }) => (
            <a href={to}>{children}</a>
        ),
    };
});

const LOGO_URL = 'http://localhost:8080/api/v1/booking/x/logo?v=1';

function renderSection(plan: PlanId, logo: OrganizationLogo) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(planQueryOptions.queryKey, buildPlan(plan));
    render(
        <QueryClientProvider client={queryClient}>
            <BookingBrandingSection logo={logo} />
        </QueryClientProvider>,
    );
}

function pick(file: File) {
    fireEvent.change(screen.getByLabelText('Subir logo'), {
        target: { files: [file] },
    });
}

describe('BookingBrandingSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.post).mockResolvedValue({ data: { data: {} } });
        vi.mocked(api.delete).mockResolvedValue({ data: null });
    });

    it('on Free explains the Clini mark and offers no upload', () => {
        renderSection('free', { logo_url: null });

        expect(
            screen.getByText(/El plan Gratis muestra «Hecho con Clini»/),
        ).not.toBeNull();
        expect(screen.queryByLabelText('Subir logo')).toBeNull();
    });

    it('on Free with a logo kept from a paid plan still lets it be removed', async () => {
        renderSection('free', { logo_url: LOGO_URL });

        expect(screen.getByText(/queda guardado/)).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Quitar logo' }));

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith('/organization/logo'),
        );
        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith('Logo eliminado'),
        );
    });

    it('uploads a valid image as multipart under `logo`', async () => {
        renderSection('practice', { logo_url: null });
        const file = new File(['png'], 'logo.png', { type: 'image/png' });

        pick(file);

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
        const [url, body] = vi.mocked(api.post).mock.calls[0];
        expect(url).toBe('/organization/logo');
        expect((body as FormData).get('logo')).toBe(file);
        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith('Logo actualizado'),
        );
    });

    it('rejects a file of another type before uploading', () => {
        renderSection('practice', { logo_url: null });

        pick(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));

        expect(
            screen.getByText(
                'El logo tiene que ser una imagen PNG, JPG o WebP.',
            ),
        ).not.toBeNull();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('rejects a file over 512 KB before uploading', () => {
        renderSection('practice', { logo_url: null });

        pick(
            new File([new Uint8Array(512 * 1024 + 1)], 'logo.png', {
                type: 'image/png',
            }),
        );

        expect(
            screen.getByText('El logo puede pesar hasta 512 KB.'),
        ).not.toBeNull();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows the current logo and offers to change it on a paid plan', () => {
        renderSection('center', { logo_url: LOGO_URL });

        expect(
            screen
                .getByRole('img', { name: 'Logo actual' })
                .getAttribute('src'),
        ).toBe(LOGO_URL);
        expect(screen.getByLabelText('Cambiar logo')).not.toBeNull();
        expect(screen.queryByText(/El plan Gratis/)).toBeNull();
    });
});
