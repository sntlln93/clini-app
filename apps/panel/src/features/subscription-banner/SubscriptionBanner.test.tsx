import { buildPlan } from '@/tests/fixtures/plan';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { Plan } from '@/types/plan';
import type { Subscription } from '@/types/subscription';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MouseEventHandler, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionBanner } from './SubscriptionBanner';

vi.mock('@tanstack/react-router', () => ({
    Link: ({
        to,
        hash,
        onClick,
        className,
        children,
    }: {
        to: string;
        hash?: string;
        onClick?: MouseEventHandler<HTMLAnchorElement>;
        className?: string;
        children: ReactNode;
    }) => (
        <a
            href={hash ? `${to}#${hash}` : to}
            className={className}
            onClick={(event) => {
                event.preventDefault();
                onClick?.(event);
            }}
        >
            {children}
        </a>
    ),
}));

function subscription(overrides: Partial<Subscription> = {}): Subscription {
    return buildSubscription(overrides.status ?? 'active', overrides);
}

const NOW = new Date('2026-10-10T12:00:00+00:00');

function renderBanner(
    value: Subscription | null | undefined,
    plan: Plan | undefined = buildPlan('practice'),
) {
    return render(
        <SubscriptionBanner subscription={value} plan={plan} now={NOW} />,
    );
}

describe('SubscriptionBanner', () => {
    it.each([
        ['no subscription', null],
        ['not loaded', undefined],
        ['active', subscription()],
        ['pending', subscription({ status: 'pending' })],
    ])('renders nothing for %s', (_label, value) => {
        const { container } = renderBanner(value);

        expect(container.innerHTML).toBe('');
    });

    it('warns about the pending payment and the days left during grace', () => {
        renderBanner(subscription({ status: 'grace', grace_days_left: 5 }));

        expect(screen.getByRole('alert').textContent).toContain(
            'Tu suscripción tiene un pago pendiente.',
        );
        expect(screen.getByRole('alert').textContent).toContain(
            'Te quedan 5 días',
        );
        expect(
            screen.getByRole('link', { name: 'Ver plan' }).getAttribute('href'),
        ).toBe('/ajustes#suscripcion');
    });

    it('uses the singular for the last day of grace', () => {
        renderBanner(subscription({ status: 'grace', grace_days_left: 1 }));

        expect(screen.getByRole('alert').textContent).toContain(
            'Te queda 1 día',
        );
    });

    it('announces the read-only mode once expired', () => {
        renderBanner(subscription({ status: 'expired' }));

        expect(screen.getByRole('alert').textContent).toContain(
            'Suscripción vencida: la agenda está en modo solo lectura',
        );
    });

    it('tells until when Consultorio lasts after a cancellation within the paid period', () => {
        renderBanner(
            subscription({
                status: 'cancelled',
                access_ends_at: '2026-11-03T12:00:00+00:00',
            }),
        );

        const banner = screen.getByRole('alert');
        expect(banner.textContent).toContain('Cancelaste la suscripción.');
        expect(banner.textContent).toContain(
            'Seguís en el plan Consultorio hasta el 3 de noviembre de 2026.',
        );
        expect(banner.textContent).toContain('pasa al plan Gratis');
        expect(banner.textContent).not.toContain('solo lectura');
    });

    it.each([
        ['with its paid period over', '2026-10-03T12:00:00+00:00'],
        ['with no paid period', null],
    ])(
        'renders nothing for a cancelled subscription %s: the organization is on Free',
        (_label, accessEndsAt) => {
            const { container } = renderBanner(
                subscription({
                    status: 'cancelled',
                    access_ends_at: accessEndsAt,
                }),
                buildPlan('free'),
            );

            expect(container.innerHTML).toBe('');
        },
    );

    it('announces the read-only mode on Free with more active professionals than its limit', () => {
        renderBanner(
            subscription({ status: 'cancelled' }),
            buildPlan('free', { active_professionals: 3 }),
        );

        const banner = screen.getByRole('alert');
        expect(banner.textContent).toContain(
            'El plan Gratis incluye un solo profesional activo y tu consultorio tiene 3.',
        );
        expect(banner.textContent).toContain('modo solo lectura');
        expect(banner.getAttribute('class')).toContain('destructive');
    });

    it('keeps the expiry notice over the professional limit: paying lifts both', () => {
        renderBanner(
            subscription({ status: 'expired' }),
            buildPlan('free', { active_professionals: 3 }),
        );

        expect(screen.getByRole('alert').textContent).toContain(
            'Suscripción vencida',
        );
    });

    it('scrolls the section into view when it is already on screen', () => {
        const section = document.createElement('section');
        section.id = 'suscripcion';
        section.scrollIntoView = vi.fn();
        document.body.appendChild(section);

        renderBanner(subscription({ status: 'expired' }));
        fireEvent.click(screen.getByRole('link', { name: 'Ver plan' }));

        expect(section.scrollIntoView).toHaveBeenCalled();
        section.remove();
    });
});
