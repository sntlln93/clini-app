import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrganizationBookingLinkSection } from '../-components/OrganizationBookingLinkSection';

describe('OrganizationBookingLinkSection', () => {
    it("shows the practice's booking link and opens it", () => {
        render(<OrganizationBookingLinkSection slug="clinica-modelo" />);

        const url = `${window.location.origin}/reservar/clinica-modelo`;
        expect(screen.getByText(url)).not.toBeNull();
        expect(
            screen.getByRole('link', { name: 'Abrir' }).getAttribute('href'),
        ).toBe(url);
        expect(
            screen.getByRole('button', { name: 'Copiar link' }),
        ).not.toBeNull();
    });
});
