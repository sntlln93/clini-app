import { api } from '@/lib/api';
import type { ProfessionalDocument } from '@/types/professional-license';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfessionalDocumentSection } from '../-components/ProfessionalDocumentSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), put: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

function renderSection(
    documentNumber: string | null,
    overrides: Partial<ProfessionalDocument> = {},
) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <ProfessionalDocumentSection
                document={{
                    document_number: documentNumber,
                    registry: documentNumber === null ? 'unchecked' : 'found',
                    ...overrides,
                }}
            />
        </QueryClientProvider>,
    );
}

describe('ProfessionalDocumentSection', () => {
    beforeEach(() => {
        vi.mocked(api.put).mockReset().mockResolvedValue({ data: {} });
    });

    it('saves the DNI without dots or spaces', async () => {
        renderSection(null);

        fireEvent.change(screen.getByLabelText('DNI'), {
            target: { value: '30.123 456' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.put).toHaveBeenCalledWith('/me/professional-document', {
                document_number: '30123456',
            }),
        );
    });

    it('shows the DNI is being saved', async () => {
        vi.mocked(api.put).mockReturnValue(new Promise(() => {}));
        renderSection(null);

        fireEvent.change(screen.getByLabelText('DNI'), {
            target: { value: '30123456' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(
            (
                await screen.findByRole('button', { name: /Guardando…/ })
            ).hasAttribute('disabled'),
        ).toBe(true);
    });

    it('has nothing to save while the field is empty', () => {
        renderSection(null);

        expect(
            screen
                .getByRole('button', { name: 'Guardar' })
                .hasAttribute('disabled'),
        ).toBe(true);
    });

    // #417: loaded once, the DNI and the name it brings are support's to change.
    it('shows a loaded DNI without a way to change it', () => {
        renderSection('30123456');

        screen.getByText('30123456');
        screen.getByText(/comunicate con el soporte de Clini/);
        expect(screen.queryByLabelText('DNI')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
    });

    it('warns before saving that only support changes it afterwards', () => {
        renderSection(null);

        screen.getByText(/una vez cargado, tu DNI y tu nombre/);
    });

    it('says when the registry no longer holds licenses for the DNI', () => {
        renderSection('30123456', { registry: 'not_found' });

        screen.getByText(/ya\s+no tiene matrículas para este DNI/);
    });

    it('says nothing about the registry while it hasn’t answered', () => {
        renderSection('30123456', { registry: 'unchecked' });

        expect(screen.queryByText(/no tiene matrículas/)).toBeNull();
    });
});
