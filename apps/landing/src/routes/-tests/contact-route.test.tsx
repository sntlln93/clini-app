import { expectNoA11yViolations } from '@/tests/a11y';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactPage } from '../-components/ContactPage';
import { Route } from '../contacto';

const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>,
) => Record<string, unknown>;

describe('/contacto', () => {
    it.each(['centro', 'consultorio', 'free'])(
        'keeps a known plan (%s) to preselect it',
        (plan) => {
            expect(validateSearch({ plan })).toEqual({ plan });
        },
    );

    it('drops an unknown plan', () => {
        expect(validateSearch({ plan: 'enterprise' })).toEqual({});
        expect(validateSearch({})).toEqual({});
    });

    it('renders the form under the site header, without a11y violations', async () => {
        const { container } = render(<ContactPage plan="centro" />);

        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Contanos sobre tu consultorio',
            }),
        ).toBeTruthy();
        expect(
            screen.getByRole('form', { name: 'Formulario de contacto' }),
        ).toBeTruthy();
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
