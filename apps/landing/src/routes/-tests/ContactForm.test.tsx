import type { ContactResult } from '@/lib/contact';
import { sendContactRequest } from '@/lib/contact';
import { expectNoA11yViolations } from '@/tests/a11y';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ContactForm } from '../-components/ContactForm';

vi.mock('@/lib/contact', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/contact')>()),
    sendContactRequest: vi.fn(),
}));

function answer(result: ContactResult) {
    vi.mocked(sendContactRequest).mockResolvedValueOnce(result);
}

function fill(label: RegExp | string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillRequired() {
    fill('Nombre', 'Laura Gómez');
    fill('Correo', 'laura@centro.test');
    fill('¿En qué te podemos ayudar?', 'Queremos migrar la agenda.');
}

function send() {
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }));
}

describe('ContactForm', () => {
    it('preselects the plan the visitor came from', () => {
        render(<ContactForm initialPlan="centro" />);

        expect(
            screen
                .getByRole('radio', { name: 'Centro' })
                .getAttribute('aria-checked'),
        ).toBe('true');
    });

    it('starts on «Todavía no sé» without a plan', () => {
        render(<ContactForm initialPlan={null} />);

        expect(
            screen
                .getByRole('radio', { name: 'Todavía no sé' })
                .getAttribute('aria-checked'),
        ).toBe('true');
    });

    it('checks the required fields before spending a request', () => {
        render(<ContactForm initialPlan={null} />);
        fill('Correo', 'laura');

        send();

        expect(screen.getByText('Ingresá tu nombre.')).toBeTruthy();
        expect(screen.getByText('Ingresá un correo válido.')).toBeTruthy();
        expect(
            screen.getByText('Contanos en qué te podemos ayudar.'),
        ).toBeTruthy();
        expect(
            screen.getByLabelText('Nombre').getAttribute('aria-invalid'),
        ).toBe('true');
        expect(sendContactRequest).not.toHaveBeenCalled();
    });

    it('sends what the visitor typed and confirms, taking focus', async () => {
        answer({ ok: true });
        render(<ContactForm initialPlan="centro" />);
        fillRequired();
        fill('Cantidad de profesionales (opcional)', '12');

        send();

        const heading = await screen.findByRole('heading', {
            name: '¡Gracias, Laura Gómez!',
        });
        expect(document.activeElement).toBe(heading);
        expect(screen.getByText('laura@centro.test')).toBeTruthy();
        expect(sendContactRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Laura Gómez',
                teamSize: '12',
                plan: 'centro',
                website: '',
            }),
        );
        expect(screen.queryByRole('form')).toBeNull();
    });

    it('shows the API field errors next to their fields', async () => {
        answer({
            ok: false,
            kind: 'validation',
            fieldErrors: { team_size: 'Ingresá al menos 1 profesional.' },
        });
        render(<ContactForm initialPlan={null} />);
        fillRequired();

        send();

        expect(
            await screen.findByText('Ingresá al menos 1 profesional.'),
        ).toBeTruthy();
        expect(
            screen
                .getByLabelText('Cantidad de profesionales (opcional)')
                .getAttribute('aria-invalid'),
        ).toBe('true');
    });

    it.each([
        [
            'rate_limited',
            'Hiciste demasiados envíos seguidos. Esperá unos minutos y volvé a intentar.',
        ],
        [
            'unexpected',
            'No pudimos enviar tu consulta. Revisá tu conexión y volvé a intentar.',
        ],
    ] as const)(
        'explains a %s failure and keeps the form',
        async (kind, message) => {
            answer({ ok: false, kind });
            render(<ContactForm initialPlan={null} />);
            fillRequired();

            send();

            expect((await screen.findByRole('alert')).textContent).toBe(
                message,
            );
            expect(
                (screen.getByLabelText('Nombre') as HTMLInputElement).value,
            ).toBe('Laura Gómez');
            await waitFor(() =>
                expect(
                    screen
                        .getByRole('button', { name: 'Enviar consulta' })
                        .hasAttribute('disabled'),
                ).toBe(false),
            );
        },
    );

    it('keeps the honeypot out of the accessibility tree and the tab order', () => {
        render(<ContactForm initialPlan={null} />);

        expect(screen.queryByRole('textbox', { name: 'Sitio web' })).toBeNull();
        const honeypot = screen.getByLabelText('Sitio web');
        expect(honeypot.getAttribute('tabindex')).toBe('-1');
        expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('keeps the submit disabled in the server HTML, until React hydrates it', () => {
        const html = renderToString(<ContactForm initialPlan={null} />);
        const submit = new DOMParser()
            .parseFromString(html, 'text/html')
            .querySelector('button[type="submit"]');

        expect(submit?.hasAttribute('disabled')).toBe(true);
    });

    it('has no detectable a11y violations', async () => {
        const { container } = render(<ContactForm initialPlan="centro" />);

        await expectNoA11yViolations(container, {
            skip: [
                {
                    id: 'color-contrast',
                    reason: 'jsdom does not render pixels, so contrast cannot be computed.',
                },
            ],
        });
    });
});
