import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AppointmentFormDialog,
    type AppointmentPrefill,
} from '../-components/AppointmentFormDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

const PROFESSIONAL: Membership = {
    id: 1,
    user: { id: 10, name: 'Dra. Ana López', email: 'ana@example.com' },
    roles: ['professional'],
    status: 'active',
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

const SERVICE = {
    id: 100,
    membership_id: 1,
    service_id: 5,
    service_name: 'Consulta general',
    duration_minutes: 30,
    price_cents: 5000,
    active: true,
};

const PATIENT = {
    id: 50,
    name: 'Juan Pérez',
    email: null,
    phone: null,
    document_type: 'dni' as const,
    document_number: '30111222',
    sex: null,
    birth_date: null,
    insurance_provider_id: null,
    created_at: '2026-01-01T00:00:00Z',
};

function mockApiGet(overrides: {
    availabilities?: unknown[];
    exceptions?: unknown[];
}) {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes('/availabilities')) {
            return Promise.resolve({
                data: { data: overrides.availabilities ?? [] },
            });
        }
        if (url === '/availability-exceptions') {
            return Promise.resolve({
                data: { data: overrides.exceptions ?? [] },
            });
        }
        if (url.includes('/services')) {
            return Promise.resolve({ data: { data: [SERVICE] } });
        }
        if (url === '/patients') {
            return Promise.resolve({
                data: {
                    data: [PATIENT],
                    meta: {
                        current_page: 1,
                        last_page: 1,
                        per_page: 15,
                        total: 1,
                    },
                    links: { first: null, last: null, prev: null, next: null },
                },
            });
        }
        return Promise.resolve({ data: { data: [] } });
    });
}

function renderDialog(
    prefill?: AppointmentPrefill,
    onOpenChange: (open: boolean) => void = () => {},
) {
    const queryClient = new QueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <AppointmentFormDialog
                open
                onOpenChange={onOpenChange}
                professionals={[PROFESSIONAL]}
                prefill={prefill}
            />
        </QueryClientProvider>,
    );
}

/**
 * Same as `mockApiGet`, except `/availabilities` and `/availability-exceptions`
 * resolve to promises the caller controls (never auto-resolved), while
 * `/services` and `/patients` behave normally so the form can still be filled.
 * Used to reproduce a submit fired while both availability queries are
 * still in flight (issue #136).
 */
function mockApiGetWithPendingAvailability() {
    let resolveAvailabilities!: (value: { data: { data: unknown[] } }) => void;
    let resolveExceptions!: (value: { data: { data: unknown[] } }) => void;

    const availabilitiesPromise = new Promise<{ data: { data: unknown[] } }>(
        (resolve) => {
            resolveAvailabilities = resolve;
        },
    );
    const exceptionsPromise = new Promise<{ data: { data: unknown[] } }>(
        (resolve) => {
            resolveExceptions = resolve;
        },
    );

    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes('/availabilities')) {
            return availabilitiesPromise;
        }
        if (url === '/availability-exceptions') {
            return exceptionsPromise;
        }
        if (url.includes('/services')) {
            return Promise.resolve({ data: { data: [SERVICE] } });
        }
        if (url === '/patients') {
            return Promise.resolve({
                data: {
                    data: [PATIENT],
                    meta: {
                        current_page: 1,
                        last_page: 1,
                        per_page: 15,
                        total: 1,
                    },
                    links: { first: null, last: null, prev: null, next: null },
                },
            });
        }
        return Promise.resolve({ data: { data: [] } });
    });

    return {
        resolveAvailabilities: () =>
            resolveAvailabilities({ data: { data: [] } }),
        resolveExceptions: () => resolveExceptions({ data: { data: [] } }),
    };
}

async function selectComboboxOption(combobox: HTMLElement, optionText: string) {
    fireEvent.click(combobox);
    const option = await screen.findByRole('option', { name: optionText });
    // A single option that hasn't been keyboard/pointer-highlighted yet
    // isn't part of the roving-tabindex group base-ui uses for selection —
    // a bare `click` doesn't register in jsdom, it needs the full pointer
    // sequence a real browser would generate (same reasoning as the status
    // select workaround in MemberEditDialog's tests).
    fireEvent.pointerDown(option);
    fireEvent.pointerUp(option);
    fireEvent.click(option);
}

/**
 * Fills every field required for `submit()` to proceed beyond the
 * prefilled professional/date/time: the service select (labelled "Servicio")
 * and the patient select (labelled "Paciente").
 */
async function fillPatientAndService() {
    await selectComboboxOption(
        screen.getByRole('combobox', { name: 'Servicio' }),
        'Consulta general',
    );
    await selectComboboxOption(
        screen.getByRole('combobox', { name: 'Paciente' }),
        'Juan Pérez — 30111222',
    );
}

describe('AppointmentFormDialog', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
    });

    it('populates professional, date and time from prefill (quick-create from a free cell)', async () => {
        mockApiGet({});
        renderDialog({ membershipId: 1, date: '2026-08-03', time: '10:00' });

        expect((screen.getByLabelText('Fecha') as HTMLInputElement).value).toBe(
            '2026-08-03',
        );
        expect((screen.getByLabelText('Hora') as HTMLInputElement).value).toBe(
            '10:00',
        );

        // The trigger shows the raw value until the popup has mounted once
        // (base-ui only resolves the item's display label from its
        // registered options), so open it to assert the pre-selected item.
        fireEvent.click(screen.getByRole('combobox', { name: 'Profesional' }));
        const option = await screen.findByRole('option', {
            name: 'Dra. Ana López',
        });
        expect(option.getAttribute('aria-selected')).toBe('true');
    });

    it('leaves professional, date and time empty with no prefill', async () => {
        mockApiGet({});
        renderDialog();

        expect((screen.getByLabelText('Fecha') as HTMLInputElement).value).toBe(
            '',
        );
        expect((screen.getByLabelText('Hora') as HTMLInputElement).value).toBe(
            '',
        );

        fireEvent.click(screen.getByRole('combobox', { name: 'Profesional' }));
        const option = await screen.findByRole('option', {
            name: 'Dra. Ana López',
        });
        expect(option.getAttribute('aria-selected')).toBe('false');
    });

    it('posts the appointment without showing the warning when the time is inside declared availability', async () => {
        const dateTime = new Date('2026-08-03T10:00:00');
        const dayOfWeek = dateTime.getDay();

        mockApiGet({
            availabilities: [
                {
                    id: 1,
                    membership_id: 1,
                    day_of_week: dayOfWeek,
                    start_time: '09:00:00',
                    end_time: '12:00:00',
                },
            ],
            exceptions: [],
        });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });

        renderDialog({ membershipId: 1, date: '2026-08-03', time: '10:00' });

        await fillPatientAndService();

        fireEvent.click(screen.getByRole('button', { name: 'Crear turno' }));

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
        expect(api.post).toHaveBeenCalledWith(
            '/appointments',
            expect.objectContaining({
                membership_id: 1,
                patient_id: 50,
                service_id: 5,
                start_at: '2026-08-03T10:00',
            }),
        );
        expect(
            screen.queryByText(
                '¿Está seguro de registrar el turno fuera del horario disponible del profesional?',
            ),
        ).toBeNull();
    });

    it('shows the warning dialog and does not post yet when the time is outside declared availability, then posts on confirm', async () => {
        mockApiGet({ availabilities: [], exceptions: [] });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });

        renderDialog({ membershipId: 1, date: '2026-08-03', time: '10:00' });

        await fillPatientAndService();

        fireEvent.click(screen.getByRole('button', { name: 'Crear turno' }));

        await screen.findByText(
            '¿Está seguro de registrar el turno fuera del horario disponible del profesional?',
        );
        expect(api.post).not.toHaveBeenCalled();

        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar de todos modos' }),
        );

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
        expect(api.post).toHaveBeenCalledWith(
            '/appointments',
            expect.objectContaining({
                membership_id: 1,
                patient_id: 50,
                service_id: 5,
                start_at: '2026-08-03T10:00',
            }),
        );
    });

    it('posts nothing when the warning dialog is cancelled', async () => {
        mockApiGet({ availabilities: [], exceptions: [] });

        renderDialog({ membershipId: 1, date: '2026-08-03', time: '10:00' });

        await fillPatientAndService();

        fireEvent.click(screen.getByRole('button', { name: 'Crear turno' }));

        await screen.findByText(
            '¿Está seguro de registrar el turno fuera del horario disponible del profesional?',
        );

        // Both the appointment dialog and the nested availability warning
        // have their own "Cancelar" action, so scope the click to the alert
        // dialog to cancel the warning specifically, not the whole form.
        const warningDialog = screen.getByRole('alertdialog');
        fireEvent.click(
            within(warningDialog).getByRole('button', { name: 'Cancelar' }),
        );

        await waitFor(() =>
            expect(
                screen.queryByText(
                    '¿Está seguro de registrar el turno fuera del horario disponible del profesional?',
                ),
            ).toBeNull(),
        );
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows an inline error and posts nothing when the service is not selected', async () => {
        const dateTime = new Date('2026-08-03T10:00:00');
        const dayOfWeek = dateTime.getDay();

        mockApiGet({
            availabilities: [
                {
                    id: 1,
                    membership_id: 1,
                    day_of_week: dayOfWeek,
                    start_time: '09:00:00',
                    end_time: '12:00:00',
                },
            ],
            exceptions: [],
        });

        const onOpenChange = vi.fn();
        renderDialog(
            { membershipId: 1, date: '2026-08-03', time: '10:00' },
            onOpenChange,
        );

        await selectComboboxOption(
            screen.getByRole('combobox', { name: 'Paciente' }),
            'Juan Pérez — 30111222',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Crear turno' }));

        await screen.findByText('Elegí un servicio.');
        expect(api.post).not.toHaveBeenCalled();
        // A successful submit calls `onOpenChange(false)` to close the
        // dialog (see `submit()` in AppointmentFormDialog.tsx), so this
        // failing to be called with `false` is what actually fixes the
        // "modal stays open" acceptance criterion — `renderDialog`'s
        // `onOpenChange` is a real no-op prop, not a hardcoded `open`, so
        // the Dialog would in fact close if validation were broken.
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it('does not skip the warning when submitted immediately while the availability queries are loading', async () => {
        const { resolveAvailabilities, resolveExceptions } =
            mockApiGetWithPendingAvailability();

        renderDialog({ membershipId: 1, date: '2026-08-03', time: '10:00' });

        await fillPatientAndService();

        const submitButton = screen.getByRole('button', {
            name: 'Crear turno',
        });
        expect((submitButton as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(submitButton);

        expect(api.post).not.toHaveBeenCalled();
        expect(
            screen.queryByText(
                '¿Está seguro de registrar el turno fuera del horario disponible del profesional?',
            ),
        ).toBeNull();

        // Let both availability queries settle with empty data — the queries
        // this test kept in flight until now.
        resolveAvailabilities();
        resolveExceptions();

        await waitFor(() =>
            expect((submitButton as HTMLButtonElement).disabled).toBe(false),
        );

        fireEvent.click(submitButton);

        // Core regression assertion: once the queries have settled, the same
        // click now evaluates `isOutside` against real (empty) data and the
        // warning shows, instead of having been silently skipped earlier.
        await screen.findByText(
            '¿Está seguro de registrar el turno fuera del horario disponible del profesional?',
        );
        expect(api.post).not.toHaveBeenCalled();
    });

    it('does not skip the warning when the form is submitted directly, bypassing the disabled submit button, while the availability queries are loading', async () => {
        mockApiGetWithPendingAvailability();

        const { baseElement } = renderDialog({
            membershipId: 1,
            date: '2026-08-03',
            time: '10:00',
        });

        await fillPatientAndService();

        // DialogContent renders through a portal appended straight to
        // `document.body` (the render's `baseElement`), not inside
        // `render()`'s own `container` — look up the form there instead.
        const form = baseElement.querySelector('form');
        expect(form).not.toBeNull();

        // Submit the form node directly instead of clicking the button, to
        // exercise `onValid`'s early-return guard independently of the
        // button's `disabled` attribute.
        fireEvent.submit(form as HTMLFormElement);

        await waitFor(() => {
            expect(api.post).not.toHaveBeenCalled();
            expect(
                screen.queryByText(
                    '¿Está seguro de registrar el turno fuera del horario disponible del profesional?',
                ),
            ).toBeNull();
        });
    });
});
