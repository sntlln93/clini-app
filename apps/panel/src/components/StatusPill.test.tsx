import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
    it.each([
        ['success', 'bg-success-wash', 'bg-success'],
        ['warning', 'bg-warning-wash', 'bg-warning'],
        ['danger', 'bg-destructive-wash', 'bg-destructive'],
        ['neutral', 'bg-muted', 'bg-muted-foreground'],
        ['info', 'bg-accent', 'bg-primary'],
    ] as const)(
        'paints the %s tone with its fill and dot',
        (tone, fill, dot) => {
            render(<StatusPill tone={tone}>Estado</StatusPill>);

            const pill = screen.getByText('Estado');
            expect(pill.className).toContain(fill);
            expect(pill.querySelector('[aria-hidden]')?.className).toContain(
                dot,
            );
        },
    );
});
