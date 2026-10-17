import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// #286: a new account lands on an agenda with nothing set up. The owner is
// registered as its professional, «Primeros pasos» walks them through what
// the practice still needs, and Ajustes lets them step out and back in.
test.use({
    expectedIssues: {
        responses: [{ url: /\/api\/v1\/me$/, status: 401 }],
        console: [
            /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
        ],
    },
});

async function fillRegistration(page: Page, path: string) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await page.goto(path);
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await page.getByLabel('Nombre', { exact: true }).fill('Dueña Nueva');
    await page
        .getByLabel('Nombre del consultorio')
        .fill(`Consultorio ${suffix}`);
    await page
        .getByLabel('Correo electrónico')
        .fill(`duena-${suffix}@test.com`);
    await page.getByLabel('Contraseña', { exact: true }).fill('password123');
    await page.getByLabel('Confirmar contraseña').fill('password123');
}

async function register(page: Page) {
    await fillRegistration(page, '/registro');
    await expect(page.getByRole('radio', { name: /Gratis/ })).toBeChecked();
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page).toHaveURL(/\/agenda/);
}

function checklist(page: Page) {
    return page.getByRole('region', { name: 'Primeros pasos' });
}

test('a new owner is the professional and completes the first steps until the checklist goes away', async ({
    page,
}) => {
    await register(page);

    await expect(
        page.getByRole('button', { name: 'Nuevo turno' }),
    ).toBeVisible();
    await expect(checklist(page)).toBeVisible();
    await expect(
        checklist(page).getByText('Sumá a quien atiende (listo)'),
    ).toBeVisible();
    await expect(
        checklist(page).getByRole('button', { name: 'Ver planes' }),
    ).toBeVisible();

    await checklist(page).getByRole('button', { name: 'Ir a Ajustes' }).click();
    await expect(page).toHaveURL(/\/ajustes/);
    const service = page
        .locator('section', {
            has: page.getByRole('heading', {
                name: 'Servicios por profesional',
            }),
        })
        .getByRole('group')
        .first();
    await service.getByRole('checkbox').click();
    await service.getByLabel('Duración (min)').fill('30');
    await service.getByLabel('Precio ($)').fill('10.000');
    await service.getByRole('button', { name: 'Asignar' }).click();
    await expect(page.getByText('Servicio asignado')).toBeVisible();

    await page.goto('/agenda');
    await expect(
        checklist(page).getByText('Cargá los servicios (listo)'),
    ).toBeVisible();

    await checklist(page)
        .getByRole('button', { name: 'Ir a Disponibilidad' })
        .click();
    await expect(page).toHaveURL(/\/disponibilidad/);
    await page.getByRole('button', { name: 'Agregar franja' }).first().click();
    await page.getByLabel('Desde').fill('09:00');
    await page.getByLabel('Hasta').fill('13:00');
    // «Sin atención» already hides while the slot is being added: wait for the save itself.
    const saved = page.waitForResponse(
        (response) =>
            /\/memberships\/\d+\/availabilities$/.test(response.url()) &&
            response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Guardar' }).click();
    expect((await saved).status()).toBe(201);

    await page.goto('/agenda');
    await expect(
        page.getByRole('button', { name: 'Nuevo turno' }),
    ).toBeVisible();
    await expect(checklist(page)).toHaveCount(0);
});

test('an owner who only manages steps out from Ajustes and back in from the checklist', async ({
    page,
}) => {
    await register(page);

    await page.goto('/ajustes');
    const attends = page.getByRole('switch', {
        name: 'Atiendo pacientes en este consultorio',
    });
    await expect(attends).toBeChecked();
    await attends.click();
    await expect(
        page.getByText(/reasignalos o cancelalos antes/),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Dejar de atender' }).click();
    await expect(
        page.getByText('Ya no figurás como profesional'),
    ).toBeVisible();
    await expect(attends).not.toBeChecked();

    await page.goto('/agenda');
    await expect(page.getByRole('button', { name: 'Nuevo turno' })).toHaveCount(
        0,
    );
    await checklist(page)
        .getByRole('button', { name: 'Sumarme como profesional' })
        .click();

    await expect(
        page.getByRole('button', { name: 'Nuevo turno' }),
    ).toBeVisible();
    await expect(
        checklist(page).getByText('Sumá a quien atiende (listo)'),
    ).toBeVisible();
});

test('choosing Consultorio from the landing creates the account and goes to the Mercado Pago checkout', async ({
    page,
}) => {
    // No Mercado Pago in e2e: stand in for the checkout start and its page.
    const checkoutUrl = 'https://checkout.example.test/preapproval';
    await page.route(/\/api\/v1\/subscription$/, (route) =>
        route.request().method() === 'POST'
            ? route.fulfill({
                  status: 201,
                  json: { data: { init_point: checkoutUrl } },
              })
            : route.fallback(),
    );
    await page.route(`${checkoutUrl}**`, (route) =>
        route.fulfill({
            contentType: 'text/html',
            body: '<title>Checkout</title>',
        }),
    );

    await fillRegistration(page, '/registro?plan=consultorio');
    await expect(
        page.getByRole('radio', { name: /Consultorio/ }),
    ).toBeChecked();
    await expect(page.getByRole('radio', { name: /Mensual/ })).toBeChecked();
    const checkout = page.waitForRequest(
        (request) =>
            request.method() === 'POST' &&
            /\/api\/v1\/subscription$/.test(request.url()),
    );
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    expect((await checkout).postDataJSON()).toEqual({ billing: 'monthly' });
    await expect(page).toHaveURL(checkoutUrl);
});

test('paying the year from the landing starts a yearly checkout (#240)', async ({
    page,
}) => {
    const checkoutUrl = 'https://checkout.example.test/preapproval-anual';
    await page.route(/\/api\/v1\/subscription$/, (route) =>
        route.request().method() === 'POST'
            ? route.fulfill({
                  status: 201,
                  json: { data: { init_point: checkoutUrl } },
              })
            : route.fallback(),
    );
    await page.route(`${checkoutUrl}**`, (route) =>
        route.fulfill({
            contentType: 'text/html',
            body: '<title>Checkout</title>',
        }),
    );

    await fillRegistration(page, '/registro?plan=consultorio&pago=anual');
    await expect(page.getByRole('radio', { name: /Anual/ })).toBeChecked();
    const checkout = page.waitForRequest(
        (request) =>
            request.method() === 'POST' &&
            /\/api\/v1\/subscription$/.test(request.url()),
    );
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    expect((await checkout).postDataJSON()).toEqual({ billing: 'annual' });
    await expect(page).toHaveURL(checkoutUrl);
});
