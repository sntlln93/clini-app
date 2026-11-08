import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import type { ProfessionalLicense } from '@/types/professional-license';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfessionalLicensesSection } from '../-components/ProfessionalLicensesSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
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

function license(overrides: Partial<ProfessionalLicense>): ProfessionalLicense {
    return {
        id: 1,
        number: 'MP 6789',
        province: 'cordoba',
        profession: 'medico',
        status: 'unverified',
        mismatch_reason: null,
        refeps_code: null,
        issuer: null,
        specialty: null,
        situation: null,
        checked_at: null,
        added: true,
        ...overrides,
    };
}

const VERIFIED = license({
    id: 1,
    status: 'verified',
    refeps_code: '541030123456',
    issuer: 'MEDICOS DE LA PROVINCIA DE CORDOBA, Consejo de',
    specialty: 'Pediatría',
    situation: 'Habilitado',
    checked_at: '2026-11-01T12:00:00Z',
});
const MISMATCH = license({
    id: 2,
    number: '4321',
    province: 'santa-fe',
    profession: 'odontologo',
    status: 'mismatch',
    mismatch_reason: 'not_enabled',
    situation: 'Suspendido',
});

function renderSection(props: {
    licenses: ProfessionalLicense[];
    hasDocument?: boolean;
    organizationProvince?: string | null;
}) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <ProfessionalLicensesSection
                licenses={props.licenses}
                hasDocument={props.hasDocument ?? true}
                organizationProvince={props.organizationProvince ?? null}
            />
        </QueryClientProvider>,
    );
}

function item(text: string) {
    return screen.getByText(text).closest('li') as HTMLElement;
}

describe('ProfessionalLicensesSection', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} });
        vi.mocked(api.delete).mockReset().mockResolvedValue({ data: {} });
        vi.mocked(notifySuccess).mockClear();
    });

    it('shows each license with what the registry said about it', () => {
        renderSection({ licenses: [VERIFIED, MISMATCH] });

        const verified = item('Médico · Córdoba · MP 6789');
        expect(within(verified).getByText('Verificada')).toBeDefined();
        expect(verified.textContent).toContain('Código REFEPS 541030123456');
        // The specialty it backs, from the registry (#387).
        expect(verified.textContent).toContain(
            'Te habilita a atender como: Pediatría',
        );
        expect(verified.textContent).toContain(
            'Entidad emisora: Consejo de Medicos de la Provincia de Cordoba',
        );

        const mismatch = item('Odontólogo · Santa Fe · 4321');
        expect(within(mismatch).getByText('No coincide')).toBeDefined();
        expect(mismatch.textContent).toContain('«Suspendido»');
    });

    it('names no specialty for a license that isn’t verified, even when the registry gave one', () => {
        renderSection({
            licenses: [{ ...MISMATCH, specialty: 'Ortodoncia' }],
        });

        expect(item('Odontólogo · Santa Fe · 4321').textContent).not.toContain(
            'Ortodoncia',
        );
    });

    it('marks only the license from the practice province as the one that counts here', () => {
        renderSection({
            licenses: [VERIFIED, MISMATCH],
            organizationProvince: 'cordoba',
        });

        expect(screen.getAllByText('Vale en este consultorio')).toHaveLength(1);
        expect(
            within(item('Médico · Córdoba · MP 6789')).getByText(
                'Vale en este consultorio',
            ),
        ).toBeDefined();
        expect(screen.getByText(/vale la de Córdoba/)).toBeDefined();
    });

    it('says the practice has no province yet when it hasn’t declared one', () => {
        renderSection({ licenses: [VERIFIED] });

        expect(screen.queryByText('Vale en este consultorio')).toBeNull();
        expect(
            screen.getByText(/todavía no declaró su provincia/),
        ).toBeDefined();
    });

    it('asks for the DNI when a license can’t be checked without it, and offers no new check', () => {
        renderSection({ licenses: [license({})], hasDocument: false });

        expect(screen.getByText('Cargá tu DNI para validarla.')).toBeDefined();
        expect(
            screen.queryByRole('button', { name: 'Volver a consultar' }),
        ).toBeNull();
    });

    it('checks every license again on demand', async () => {
        renderSection({ licenses: [license({})] });

        fireEvent.click(
            screen.getByRole('button', { name: 'Volver a consultar' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/me/licenses/verification'),
        );
    });

    it('shows the check is running while the registry answers', async () => {
        vi.mocked(api.post).mockReturnValue(new Promise(() => {}));
        renderSection({ licenses: [license({})] });

        fireEvent.click(
            screen.getByRole('button', { name: 'Volver a consultar' }),
        );

        const running = await screen.findByRole('button', {
            name: /Consultando…/,
        });
        expect(running.hasAttribute('disabled')).toBe(true);
        expect(within(running).getByRole('status')).toBeDefined();
        expect(
            screen.getByText(
                'Conectando con el Buscador Nacional de Profesionales de la Salud',
            ),
        ).toBeDefined();
    });

    it('takes a license out of Clini after confirming', async () => {
        renderSection({ licenses: [VERIFIED] });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Quitar de Clini la matrícula MP 6789',
            }),
        );
        fireEvent.click(await screen.findByRole('button', { name: 'Quitar' }));

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith('/me/licenses/1/clini'),
        );
    });

    // #387: the registry's licenses for the DNI that aren't in Clini yet.
    it('offers the registry’s other licenses for the DNI, to add to Clini', async () => {
        vi.mocked(api.put).mockReset().mockResolvedValue({ data: {} });
        renderSection({
            licenses: [
                VERIFIED,
                license({
                    id: 7,
                    number: '501',
                    province: 'la-rioja',
                    profession: 'kinesiologo',
                    status: 'verified',
                    specialty: 'Kinesiólogo',
                    added: false,
                }),
            ],
        });

        screen.getByText('En el Buscador para tu DNI');
        const offered = item('Kinesiólogo · La Rioja · 501');
        expect(offered.textContent).not.toContain('Te habilita');
        fireEvent.click(
            within(offered).getByRole('button', {
                name: 'Agregar a Clini la matrícula 501',
            }),
        );

        await waitFor(() =>
            expect(api.put).toHaveBeenCalledWith('/me/licenses/7/clini'),
        );
    });

    it('asks for the DNI to bring the licenses, and offers to look it up again once it is there', () => {
        renderSection({ licenses: [], hasDocument: false });

        screen.getByText('Cargá tu DNI para traer tus matrículas.');
        expect(
            screen.queryByRole('button', { name: 'Volver a consultar' }),
        ).toBeNull();
        expect(screen.queryByLabelText('Número')).toBeNull();
    });

    it('looks the DNI up again even before any license is in Clini', () => {
        renderSection({ licenses: [] });

        screen.getByText('Todavía no agregaste matrículas a Clini.');
        screen.getByRole('button', { name: 'Volver a consultar' });
    });
});
