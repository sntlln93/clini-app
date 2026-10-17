import { expect, test } from '../fixtures';
import { sendContactForm } from './contact-form';

test.describe('on a phone', () => {
    test.use({ viewport: { width: 360, height: 800 } });

    test('a visitor goes from the Centro plan to the contact form and sends it', async ({
        page,
    }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Coordinar una llamada' }).click();

        await expect(page).toHaveURL(/\/contacto\?plan=centro$/);
        await expect(
            page.getByRole('heading', {
                level: 1,
                name: 'Contanos sobre tu consultorio',
            }),
        ).toBeVisible();
        await expect(
            page.getByRole('radio', { name: 'Centro' }),
        ).toHaveAttribute('aria-checked', 'true');

        await sendContactForm(page, {
            name: `Visitante e2e ${Date.now()}`,
            email: 'visitante@e2e.test',
            message: 'Somos 12 profesionales y queremos migrar la agenda.',
        });
    });
});

// CLAUDE.md: no page-level horizontal scroll on any viewport.
test('the contact page has no page-level horizontal scroll on phones', async ({
    page,
}) => {
    for (const width of [320, 360, 400]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/contacto');
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
            `horizontal scroll at ${width}px`,
        ).toBe(true);
    }
});

// The theme's 44px coarse-pointer floor is scoped to the SPAs' #root, so the
// landing's form sizes its own controls (CLAUDE.md, #270).
test.describe('on a coarse-pointer device', () => {
    test.use({
        hasTouch: true,
        isMobile: true,
        viewport: { width: 360, height: 800 },
    });

    test('every form control is at least 44px tall', async ({ page }) => {
        await page.goto('/contacto');
        expect(
            await page.evaluate(() => matchMedia('(pointer: coarse)').matches),
        ).toBe(true);

        const form = page.getByRole('form', { name: 'Formulario de contacto' });
        for (const control of await form
            .locator('input:not([tabindex="-1"]), textarea, button')
            .all()) {
            const box = await control.boundingBox();
            expect(
                box?.height ?? 0,
                await control.evaluate((el) => el.outerHTML.slice(0, 80)),
            ).toBeGreaterThanOrEqual(44);
        }
    });
});
