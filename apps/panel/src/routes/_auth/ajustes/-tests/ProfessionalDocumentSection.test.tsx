import { api } from '@/lib/api';
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

function renderSection(documentNumber: string | null) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <ProfessionalDocumentSection documentNumber={documentNumber} />
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

    it('saves an emptied field as no DNI', async () => {
        renderSection('30123456');

        fireEvent.change(screen.getByLabelText('DNI'), {
            target: { value: '' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.put).toHaveBeenCalledWith('/me/professional-document', {
                document_number: null,
            }),
        );
    });

    it('has nothing to save while the DNI is the saved one', () => {
        renderSection('30123456');

        fireEvent.change(screen.getByLabelText('DNI'), {
            target: { value: '30.123.456' },
        });

        expect(
            screen
                .getByRole('button', { name: 'Guardar' })
                .hasAttribute('disabled'),
        ).toBe(true);
    });
});
