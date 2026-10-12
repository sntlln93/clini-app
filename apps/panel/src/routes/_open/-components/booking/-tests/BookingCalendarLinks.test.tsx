import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { BookingConfirmation } from '@/types/booking';

import { BookingCalendarLinks } from '../BookingCalendarLinks';

const CONFIRMATION: BookingConfirmation = {
    start_at: '2026-08-03T13:00:00Z',
    end_at: '2026-08-03T13:45:00Z',
    professional_name: 'Ana Gómez',
    service_name: 'Consulta',
    organization_name: 'Consultorio Salud',
    organization_address: null,
};

describe('BookingCalendarLinks', () => {
    it('offers Google Calendar in a new tab and the .ics as a download, as links', () => {
        render(
            <BookingCalendarLinks confirmation={CONFIRMATION} slug="salud" />,
        );

        const group = screen.getByRole('group', {
            name: 'Agregar a mi calendario',
        });
        const google = within(group).getByRole('link', {
            name: /^Google Calendar\s*\(se abre en otra pestaña\)$/,
        });
        const ics = within(group).getByRole('link', {
            name: 'Descargar .ics',
        });

        expect(google.getAttribute('target')).toBe('_blank');
        expect(google.getAttribute('rel')).toBe('noopener noreferrer');
        expect(ics.getAttribute('download')).toBe('turno.ics');
        expect(ics.getAttribute('href')).toMatch(
            /^data:text\/calendar;charset=utf-8,BEGIN%3AVCALENDAR/,
        );
    });

    // Unmerged, the base's `border-transparent` is emitted after `border-border` and wins.
    it('keeps the outline border on both links', () => {
        render(
            <BookingCalendarLinks confirmation={CONFIRMATION} slug="salud" />,
        );

        for (const link of screen.getAllByRole('link')) {
            const classes = link.className.split(' ');
            expect(classes).toContain('border-border');
            expect(classes).not.toContain('border-transparent');
        }
    });
});
