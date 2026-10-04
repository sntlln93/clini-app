import { api } from '@/lib/api';
import { buildProfessional } from '@/tests/fixtures/professional';
import type { Appointment } from '@/types/appointment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AgendaDayView,
    type AgendaDayViewProps,
} from '../-components/AgendaDayView';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
    return {
        id: 1,
        membership_id: 1,
        patient_id: 50,
        service_id: 100,
        status: 'scheduled',
        origin: 'manual',
        start_at: '2026-08-03T10:00:00',
        end_at: '2026-08-03T10:30:00',
        reason: null,
        notes: null,
        cancelled_at: null,
        cancellation_reason: null,
        rescheduled_from_id: null,
        arrived_at: null,
        patient_name: 'Juan Pérez',
        service_name: 'Consulta general',
        ...overrides,
    };
}

function renderDayView(props: Partial<AgendaDayViewProps> = {}) {
    const queryClient = new QueryClient();
    const defaults: AgendaDayViewProps = {
        date: new Date(2026, 7, 3),
        professionals: [buildProfessional()],
        appointments: [],
        canUpdate: () => true,
        canCreate: () => true,
        onCellClick: undefined,
    };
    const merged = { ...defaults, ...props };

    const { container } = render(
        <QueryClientProvider client={queryClient}>
            <AgendaDayView {...merged} />
        </QueryClientProvider>,
    );

    return { ...merged, container };
}

describe('AgendaDayView', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
        invalidate.mockReset();
    });

    it('renders 12 clickable hour slots for a creatable column', () => {
        renderDayView({ canCreate: () => true });

        expect(screen.getAllByRole('button')).toHaveLength(12);
    });

    it('gives every slot button in a creatable column an accessible name naming its own hour and the professional', () => {
        const professional = buildProfessional({
            user: { id: 10, name: 'Dra. Ana López', email: 'ana@example.com' },
        });
        renderDayView({ professionals: [professional], canCreate: () => true });

        const names = screen
            .getAllByRole('button')
            .map((button) => button.getAttribute('aria-label'));
        const expectedNames = Array.from({ length: 12 }, (_, index) => {
            const hour = String(8 + index).padStart(2, '0');
            return `Crear turno a las ${hour}:00 para Dra. Ana López`;
        });

        expect(names).toEqual(expectedNames);
    });

    it('reports the right professional and hour when an hour slot is clicked', () => {
        const onCellClick = vi.fn();
        const professional = buildProfessional({ id: 1 });
        renderDayView({
            professionals: [professional],
            canCreate: () => true,
            onCellClick,
        });

        fireEvent.click(screen.getAllByRole('button')[0]);

        expect(onCellClick).toHaveBeenCalledWith(1, 8);
    });

    it('exposes no clickable hour slots for a non-creatable column (AC5)', () => {
        const onCellClick = vi.fn();
        renderDayView({ canCreate: () => false, onCellClick });

        expect(screen.queryByRole('button')).toBeNull();
        expect(onCellClick).not.toHaveBeenCalled();
    });

    it('gates creation per column for a create.own user over a colleague (AC5)', () => {
        const onCellClick = vi.fn();
        const own = buildProfessional({ id: 1 });
        const colleague = buildProfessional({ id: 2 });
        renderDayView({
            professionals: [own, colleague],
            canCreate: (membership) => membership.id === 1,
            onCellClick,
        });

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(12);

        buttons.forEach((button) => fireEvent.click(button));

        expect(onCellClick).not.toHaveBeenCalledWith(2, expect.any(Number));
        onCellClick.mock.calls.forEach((call) => {
            expect(call[0]).toBe(1);
        });
    });

    it('still shows the professional and their appointments when the column is not creatable', () => {
        const professional = buildProfessional({ id: 1 });
        renderDayView({
            professionals: [professional],
            canCreate: () => false,
            appointments: [buildAppointment({ membership_id: 1 })],
        });

        expect(screen.getByText('Dra. Ana López')).toBeTruthy();
        expect(screen.getByText('Juan Pérez')).toBeTruthy();
    });

    it('renders a column only for the professionals it receives, not every professional that exists', () => {
        const professionals = [
            buildProfessional({ id: 1 }),
            buildProfessional({ id: 2 }),
        ];
        const { container } = renderDayView({
            professionals: [professionals[0]],
        });

        expect(container.querySelectorAll('.h-10.border-b.px-2')).toHaveLength(
            1,
        );
    });

    it('positions a 30-minute appointment block at its start offset with at least the compact-card minimum height', () => {
        const professional = buildProfessional({ id: 1 });
        renderDayView({
            professionals: [professional],
            appointments: [buildAppointment({ membership_id: 1 })], // 10:00–10:30
        });

        let block: HTMLElement | null = screen.getByText('Juan Pérez');
        while (block && !block.style.top) {
            block = block.parentElement;
        }
        expect(block).not.toBeNull();

        // START_HOUR=8, HOUR_HEIGHT_PX=96 → 1.6px/min; 10:00 is 120min after 8:00 → 192px.
        expect(block?.style.top).toBe('192px');
        expect(parseFloat(block?.style.height ?? '0')).toBeGreaterThanOrEqual(
            48,
        );
    });

    it('lets professional columns share the available width instead of a fixed 48-unit column', () => {
        const professional = buildProfessional({ id: 1 });
        const { container } = renderDayView({ professionals: [professional] });

        const row = container.querySelector('.overflow-auto > div');
        expect(row?.className).not.toMatch(/\bmin-w-max\b/);

        const column = screen.getByText('Dra. Ana López').closest('.border-r');
        expect(column?.className).not.toMatch(/\bw-48\b/);
        expect(column?.className).not.toMatch(/\bshrink-0\b/);
    });

    function blockOf(text: string): HTMLElement | null {
        let block: HTMLElement | null = screen.getByText(text);
        while (block && !block.style.top) {
            block = block.parentElement;
        }
        return block;
    }

    it('extends the grid up to a 07:00 appointment instead of clipping it', () => {
        renderDayView({
            appointments: [
                buildAppointment({
                    start_at: '2026-08-03T07:00:00',
                    end_at: '2026-08-03T07:30:00',
                }),
            ],
        });

        expect(blockOf('Juan Pérez')?.style.top).toBe('0px');
        expect(
            screen.getByRole('button', {
                name: 'Crear turno a las 07:00 para Dra. Ana López',
            }),
        ).toBeTruthy();
        expect(
            screen.getAllByRole('button', { name: /^Crear turno/ }),
        ).toHaveLength(13);
    });

    it('extends the grid down to fit a 21:00–21:30 appointment inside the column', () => {
        renderDayView({
            appointments: [
                buildAppointment({
                    start_at: '2026-08-03T21:00:00',
                    end_at: '2026-08-03T21:30:00',
                }),
            ],
        });

        const block = blockOf('Juan Pérez');
        const columnHeight = parseFloat(
            block?.parentElement?.style.height ?? '0',
        );
        expect(
            parseFloat(block?.style.top ?? '0') +
                parseFloat(block?.style.height ?? '0'),
        ).toBeLessThanOrEqual(columnHeight);
        expect(
            screen.getByRole('button', {
                name: 'Crear turno a las 21:00 para Dra. Ana López',
            }),
        ).toBeTruthy();
    });

    it('keeps the default 08:00–20:00 grid when every appointment fits', () => {
        renderDayView({ appointments: [buildAppointment()] });

        const cells = screen.getAllByRole('button', { name: /^Crear turno/ });
        expect(cells[0].getAttribute('aria-label')).toContain('08:00');
        expect(cells.at(-1)?.getAttribute('aria-label')).toContain('19:00');
    });

    // jsdom ignores CSS `pointer-events`, so this can't prove a click passes
    // through the card: it asserts the click-through classes and that the cell
    // underneath stays wired. Real hit-testing is a browser (Playwright) concern.
    it('marks a static cancelled card dimmed and click-through, and keeps the cell underneath wired', () => {
        const onCellClick = vi.fn();
        renderDayView({
            canUpdate: () => false,
            onCellClick,
            appointments: [buildAppointment({ status: 'cancelled' })],
        });

        const block = blockOf('Juan Pérez');
        expect(block?.className).toMatch(/\bpointer-events-none\b/);
        expect(block?.className).toMatch(/\bopacity-60\b/);
        // A card with no actions must not re-enable pointer events inside the wrapper.
        expect(block?.querySelector('.pointer-events-auto')).toBeNull();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Crear turno a las 10:00 para Dra. Ana López',
            }),
        );
        expect(onCellClick).toHaveBeenCalledWith(1, 10);
    });

    it('paints inactive appointments before active ones in the same slot', () => {
        renderDayView({
            appointments: [
                buildAppointment({ id: 1, patient_name: 'Paciente activa' }),
                buildAppointment({
                    id: 2,
                    status: 'cancelled',
                    patient_name: 'Paciente cancelada',
                }),
            ],
        });

        const active = blockOf('Paciente activa');
        const cancelled = blockOf('Paciente cancelada');
        expect(
            cancelled!.compareDocumentPosition(active!) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });
});
