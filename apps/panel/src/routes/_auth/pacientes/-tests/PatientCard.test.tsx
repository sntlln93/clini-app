import { buildContact, buildPatient } from '@/tests/fixtures/patient';
import { renderInRouter } from '@/tests/render-in-router';
import type { Patient } from '@/types/patient';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientCard } from '../-components/PatientCard';

function renderCard(overrides: Partial<Patient> = {}) {
    return renderInRouter(
        <ul>
            <PatientCard patient={buildPatient(overrides)} />
        </ul>,
    );
}

describe('PatientCard', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows the initials, the document and the age, and opens the patient', async () => {
        renderCard({ id: 7, birth_date: '1990-03-15' });

        const link = await screen.findByRole('link', { name: 'Ana Gómez' });
        expect(link.getAttribute('href')).toBe('/pacientes/7');
        screen.getByText('AG');
        screen.getByText('DNI 30111222 · 36 años');
    });

    it('leaves the age out when the birth date is unknown', async () => {
        renderCard();

        await screen.findByText('DNI 30111222');
    });

    it('calls the phone and writes to the WhatsApp contact', async () => {
        renderCard({
            contacts: [
                buildContact({
                    id: 1,
                    type: 'email',
                    value: 'ana@example.com',
                }),
                buildContact({ id: 2, value: '+543804123456' }),
                buildContact({
                    id: 3,
                    type: 'whatsapp',
                    value: '+5493804123456',
                }),
            ],
        });

        const call = await screen.findByRole('link', {
            name: 'Llamar a Ana Gómez',
        });
        expect(call.getAttribute('href')).toBe('tel:+543804123456');
        expect(
            screen
                .getByRole('link', { name: 'WhatsApp a Ana Gómez' })
                .getAttribute('href'),
        ).toBe('https://wa.me/5493804123456');
        expect(
            screen.queryByRole('link', { name: 'Enviar mail a Ana Gómez' }),
        ).toBeNull();
    });

    it('offers no WhatsApp without a WhatsApp contact', async () => {
        renderCard({ contacts: [buildContact({ value: '+543804123456' })] });

        await screen.findByRole('link', { name: 'Llamar a Ana Gómez' });
        expect(
            screen.queryByRole('link', { name: 'WhatsApp a Ana Gómez' }),
        ).toBeNull();
    });

    it('calls the WhatsApp number when it is the only one', async () => {
        renderCard({
            contacts: [
                buildContact({ type: 'whatsapp', value: '+5493804123456' }),
            ],
        });

        const call = await screen.findByRole('link', {
            name: 'Llamar a Ana Gómez',
        });
        expect(call.getAttribute('href')).toBe('tel:+5493804123456');
        screen.getByRole('link', { name: 'WhatsApp a Ana Gómez' });
    });

    it('falls back to the email without a phone', async () => {
        renderCard({
            contacts: [
                buildContact({ type: 'email', value: 'ana@example.com' }),
            ],
        });

        const mail = await screen.findByRole('link', {
            name: 'Enviar mail a Ana Gómez',
        });
        expect(mail.getAttribute('href')).toBe('mailto:ana@example.com');
    });

    it('says so when there is no way to reach the patient', async () => {
        renderCard();

        await screen.findByText('Sin datos de contacto');
    });
});
