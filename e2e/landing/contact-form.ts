import type { Page } from '@playwright/test';
import { expect } from '../fixtures';

export type ContactFormInput = {
    name: string;
    email: string;
    message: string;
};

/**
 * Fills and sends /contacto on a page already there. The page is
 * server-rendered: a click before hydration changes nothing (and a submit
 * would be the browser's own GET), so wait until a radio answers first.
 */
export async function sendContactForm(page: Page, input: ContactFormInput) {
    const consultorio = page.getByRole('radio', { name: 'Consultorio' });
    await expect(async () => {
        await consultorio.click();
        await expect(consultorio).toHaveAttribute('aria-checked', 'true', {
            timeout: 1_000,
        });
    }).toPass();
    await page.getByRole('radio', { name: 'Centro' }).click();

    await page.getByLabel('Nombre').fill(input.name);
    await page.getByLabel('Correo').fill(input.email);
    await page.getByLabel('¿En qué te podemos ayudar?').fill(input.message);
    await page.getByRole('button', { name: 'Enviar consulta' }).click();

    await expect(
        page.getByRole('heading', { name: `¡Gracias, ${input.name}!` }),
    ).toBeVisible();
}
