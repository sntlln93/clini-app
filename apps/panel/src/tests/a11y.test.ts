import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from './a11y';

function mount(html: string): HTMLDivElement {
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    return container;
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('expectNoA11yViolations', () => {
    it('resolves without throwing on conformant markup', async () => {
        const container = mount('<button type="button">Guardar</button>');

        await expect(
            expectNoA11yViolations(container),
        ).resolves.toBeUndefined();
    });

    it('rejects on a real violation, naming the rule id and the offending node', async () => {
        const container = mount('<img src="/x.png">');

        let thrown: unknown;
        try {
            await expectNoA11yViolations(container);
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(Error);
        const message = (thrown as Error).message;
        expect(message).toContain('image-alt');
        expect(message).toContain('<img src="/x.png">');
    });

    it('skip disables only the named rule, other violations are still reported', async () => {
        const container = mount('<img src="/x.png"><input type="text">');

        let thrown: unknown;
        try {
            await expectNoA11yViolations(container, {
                skip: [
                    {
                        id: 'image-alt',
                        reason: 'deliberately skipped for this test',
                    },
                ],
            });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(Error);
        const message = (thrown as Error).message;
        expect(message).toContain('label');
        expect(message).not.toContain('image-alt');
    });

    it('does not fail when axe reports an incomplete result and no violations', async () => {
        const container = mount(
            '<p style="color: #000000; background-color: #ffffff;">Texto</p>',
        );

        // Empirical precondition: jsdom can't render pixels, so axe can't
        // decide color-contrast and reports it under `incomplete`, not
        // `violations` - proving this case is meaningfully different from
        // case 2, not a tautology.
        const probe = await axe.run(container, {
            runOnly: { type: 'rule', values: ['color-contrast'] },
        });
        expect(probe.violations).toEqual([]);
        expect(probe.incomplete.length).toBeGreaterThan(0);

        await expect(
            expectNoA11yViolations(container),
        ).resolves.toBeUndefined();
    });
});
