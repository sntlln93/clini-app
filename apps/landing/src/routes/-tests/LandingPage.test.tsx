import { expectNoA11yViolations } from '@/tests/a11y';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingPage } from '../-components/LandingPage';
import { DAY_SLOTS } from '../-components/day-slots';
import { COMPARE, PLANS } from '../-components/plans';

describe('LandingPage', () => {
    // A printed prescription has no validity (Res. MS 2214/2025): Clini only
    // records the indicated medication, so nothing may offer a prescription (#319).
    it('never mentions prescriptions, the compare table included', () => {
        render(<LandingPage />);

        expect(document.body.textContent).not.toMatch(/receta|imprimir/i);
        const labels = [
            ...PLANS.flatMap((plan) => plan.features.map((f) => f.label)),
            ...COMPARE.flatMap((group) => group.rows.map((row) => row.label)),
        ];
        expect(labels.filter((label) => /receta/i.test(label))).toEqual([]);
        expect(labels).toContain('Medicación indicada');
    });

    // The reminder carries only the practice, the day and the time: the
    // professional and the service are behind its link (#320).
    it('never claims the reminder names the professional', () => {
        const reminder = DAY_SLOTS.find((slot) =>
            /recordatorio/i.test(slot.title),
        );

        expect(reminder?.body).toMatch(/no nombra al profesional/);
        expect(reminder?.body).not.toMatch(/la hora y el profesional/);
        expect(reminder?.detail.rows?.map(([label]) => label)).toEqual([
            'Para',
            'Turno',
            'Detalles',
            'Canal',
        ]);
    });

    // The clinical history is append-only (#323): a note or a medication
    // record is amended, never edited or deleted.
    it('describes clinical records as corrected by amendment, never edited', () => {
        const notes = DAY_SLOTS.find((slot) =>
            /notas de la visita/i.test(slot.title),
        );

        expect(notes?.body).toMatch(/Nada se borra ni se edita/);
        expect(notes?.body).toMatch(/enmienda/);
    });

    // #359: the medication is part of the history, read as the notes are.
    it('never claims the medication is seen only by whoever indicated it', () => {
        const notes = DAY_SLOTS.find((slot) =>
            /notas de la visita/i.test(slot.title),
        );

        expect(notes?.body).not.toMatch(/solo la ve/i);
        expect(notes?.body).toMatch(/historia clínica, que es del paciente/);
    });

    // #364: another professional's records open only with the patient's code.
    it('says the patient opens what other professionals recorded with their code', () => {
        const notes = DAY_SLOTS.find((slot) =>
            /notas de la visita/i.test(slot.title),
        );

        expect(notes?.body).toMatch(
            /lo de otros cuando el paciente le comparte su código/,
        );
    });

    // #362: indicating medication warns about a matching current allergy.
    it('says indicating medication warns about a current allergy', () => {
        const notes = DAY_SLOTS.find((slot) =>
            /notas de la visita/i.test(slot.title),
        );

        expect(notes?.body).toMatch(
            /coincide con una alergia vigente del paciente, Clini te avisa/,
        );
    });

    it('links the calls to action to the panel', () => {
        render(<LandingPage />);

        expect(
            screen.getByRole('link', { name: 'Ingresar' }).getAttribute('href'),
        ).toMatch(/\/login$/);
        for (const link of screen.getAllByRole('link', {
            name: 'Empezar gratis',
        })) {
            expect(link.getAttribute('href')).toMatch(/\/registro$/);
        }
    });

    it('sends the commercial calls to action to the contact form', () => {
        render(<LandingPage />);

        expect(
            screen
                .getByRole('link', { name: 'Coordinar una llamada' })
                .getAttribute('href'),
        ).toBe('/contacto?plan=centro');
        expect(
            screen
                .getByRole('link', { name: 'Hablar con nosotros' })
                .getAttribute('href'),
        ).toBe('/contacto');
    });

    it('roots the header links at the home page, so they work from /contacto too', () => {
        render(<LandingPage />);

        const nav = screen.getByRole('navigation', { name: 'Principal' });
        for (const name of ['Cómo funciona', 'Precio', 'Preguntas']) {
            expect(
                within(nav).getByRole('link', { name }).getAttribute('href'),
            ).toMatch(/^\/#/);
        }
        expect(
            screen
                .getByRole('link', { name: 'Clini, inicio' })
                .getAttribute('href'),
        ).toBe('/#top');
    });

    it('shows every appointment status in the agenda legend', () => {
        render(<LandingPage />);

        const legend = screen.getByRole('figure').querySelector('figcaption');
        for (const label of [
            'Agendado',
            'Confirmado',
            'Llegó',
            'Completado',
            'Ausente',
            'Reserva online',
        ]) {
            expect(legend?.textContent).toContain(label);
        }
    });

    it('has no detectable a11y violations', async () => {
        const { container } = render(<LandingPage />);

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
