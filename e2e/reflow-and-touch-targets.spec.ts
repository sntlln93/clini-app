import type { Page } from '@playwright/test';
import type { ExpectedIssues } from './fixtures';
import { expect, test } from './fixtures';
import { STORAGE_STATE } from './storage-state';

// Every public-route case below (anonymous session) hits the same session
// probe as `smoke.spec.ts`'s unauthenticated-visitor test: the network-level
// 401 and Chromium's own resource-load log for it are both expected noise,
// not evidence of a bug — see that spec for the full explanation.
const ANONYMOUS_SESSION_PROBE_ISSUES: ExpectedIssues = {
    responses: [{ url: /\/api\/v1\/me$/, status: 401 }],
    console: [
        /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
    ],
};

// Browser zoom shrinks the CSS viewport (in CSS px), it does not change the
// device pixel ratio — so testing "N% zoom" means testing at the CSS
// viewport size zoom would leave behind. A 1280x768 window (Playwright's
// desktop default) at 200% zoom leaves a 640x384 CSS viewport; at 400% zoom
// it leaves 320x384... but WCAG 1.4.10 states the 400% checkpoint as a
// 320 CSS-px *width* specifically (height is unconstrained/scrollable), so
// these specs pair 320 width with a taller 640 height to give reflowed
// content room to stack vertically instead of manufacturing a false
// horizontal-scroll failure out of a squashed height.

async function assertNoPageLevelHorizontalScroll(page: Page) {
    const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
    }));

    expect(
        overflow.scrollWidth,
        `page-level horizontal scroll: document.documentElement.scrollWidth (${overflow.scrollWidth}) > clientWidth (${overflow.clientWidth})`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe('reflow at ~200% zoom (640x384), authenticated', () => {
    test.use({
        storageState: STORAGE_STATE,
        viewport: { width: 640, height: 384 },
    });

    test('/agenda has no page-level horizontal scroll', async ({ page }) => {
        await page.goto('/agenda');
        await page.waitForLoadState('networkidle');

        await assertNoPageLevelHorizontalScroll(page);
    });

    test('/pacientes has no page-level horizontal scroll', async ({ page }) => {
        await page.goto('/pacientes');
        await page.waitForLoadState('networkidle');

        await assertNoPageLevelHorizontalScroll(page);
    });
});

test.describe('reflow at ~400% zoom (320x640), authenticated', () => {
    test.use({
        storageState: STORAGE_STATE,
        viewport: { width: 320, height: 640 },
    });

    test('/agenda has no page-level horizontal scroll', async ({ page }) => {
        await page.goto('/agenda');
        await page.waitForLoadState('networkidle');

        await assertNoPageLevelHorizontalScroll(page);
    });

    test('/pacientes has no page-level horizontal scroll', async ({ page }) => {
        await page.goto('/pacientes');
        await page.waitForLoadState('networkidle');

        await assertNoPageLevelHorizontalScroll(page);
    });

    test('/reportes has no page-level horizontal scroll', async ({ page }) => {
        await page.goto('/reportes');
        await page.waitForLoadState('networkidle');

        await assertNoPageLevelHorizontalScroll(page);
    });
});

test.describe('reflow at ~400% zoom (320x640) with a scaled root font-size', () => {
    test.use({
        storageState: STORAGE_STATE,
        viewport: { width: 320, height: 640 },
    });

    test('/agenda has no page-level horizontal scroll at 24px root font-size', async ({
        page,
    }) => {
        await page.goto('/agenda');
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => {
            document.documentElement.style.fontSize = '24px';
        });

        await assertNoPageLevelHorizontalScroll(page);
    });
});

test.describe('reflow at ~400% zoom (320x640) with a scaled root font-size, public', () => {
    test.use({
        viewport: { width: 320, height: 640 },
        expectedIssues: ANONYMOUS_SESSION_PROBE_ISSUES,
    });

    test('/login has no page-level horizontal scroll at 24px root font-size', async ({
        page,
    }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => {
            document.documentElement.style.fontSize = '24px';
        });

        await assertNoPageLevelHorizontalScroll(page);
    });
});

// Every visible interactive element must clear the WCAG 2.5.8 44x44px touch
// target floor once the coarse-pointer media query applies (`@clini/theme`'s
// `@media (pointer: coarse)` block), except elements explicitly opted out
// via `.touch-target-exempt` (inline text links inside a sentence). The
// target is the element's box or, for checkbox/radio/switch, the larger
// absolutely positioned `::after` hit area drawn around it.
async function collectUndersizedTouchTargets(page: Page): Promise<string[]> {
    const pointerIsCoarse = await page.evaluate(
        () => matchMedia('(pointer: coarse)').matches,
    );
    expect(
        pointerIsCoarse,
        'expected (pointer: coarse) to match under this touch-device emulation — the whole case is meaningless if it does not',
    ).toBe(true);

    return page.evaluate(() => {
        const selector =
            'button, a, input, [role="button"], [role="menuitem"], [role="switch"], [role="checkbox"], [role="radio"]';
        const offenders: string[] = [];

        for (const element of document.querySelectorAll<HTMLElement>(
            selector,
        )) {
            if (element.classList.contains('touch-target-exempt')) {
                continue;
            }
            if (
                !element.checkVisibility({
                    checkOpacity: true,
                    checkVisibilityCSS: true,
                })
            ) {
                continue;
            }

            const rect = element.getBoundingClientRect();
            const hitArea = getComputedStyle(element, '::after');
            const hasHitArea =
                element.matches(
                    '[data-slot="switch"], [data-slot="checkbox"], [data-slot="radio-group-item"]',
                ) &&
                hitArea.content !== 'none' &&
                hitArea.position === 'absolute' &&
                hitArea.pointerEvents !== 'none';
            const width = Math.max(
                rect.width,
                hasHitArea ? parseFloat(hitArea.width) : 0,
            );
            const height = Math.max(
                rect.height,
                hasHitArea ? parseFloat(hitArea.height) : 0,
            );
            if (width < 44 || height < 44) {
                const accessibleName =
                    element.getAttribute('aria-label') ??
                    element.textContent?.trim() ??
                    '(no accessible name)';
                offenders.push(
                    `<${element.tagName.toLowerCase()}> "${accessibleName}" measured ${width.toFixed(1)}x${height.toFixed(1)}px`,
                );
            }
        }

        return offenders;
    });
}

test.describe('touch targets on a coarse-pointer device', () => {
    test.use({
        hasTouch: true,
        isMobile: true,
        expectedIssues: ANONYMOUS_SESSION_PROBE_ISSUES,
    });

    test('/login has no touch target under 44px', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        const offenders = await collectUndersizedTouchTargets(page);
        expect(offenders, offenders.join('\n')).toEqual([]);
    });

    test.describe('authenticated', () => {
        test.use({ storageState: STORAGE_STATE });

        for (const path of [
            '/agenda',
            '/pacientes/nuevo',
            '/profesionales/nuevo',
        ]) {
            test(`${path} has no touch target under 44px`, async ({ page }) => {
                await page.goto(path);
                await page.waitForLoadState('networkidle');

                const offenders = await collectUndersizedTouchTargets(page);
                expect(offenders, offenders.join('\n')).toEqual([]);
            });
        }
    });
});

// The 44px floor must not resize controls whose box is the drawing itself
// (#270): a switch stayed a 44px circle and a checkbox/radio a 44px square.
// Their hit area grows through `::after` instead, centered on the control.
test.describe('toggles keep their shape on a coarse-pointer device', () => {
    test.use({ storageState: STORAGE_STATE, hasTouch: true, isMobile: true });

    for (const { path, slot, width, height } of [
        { path: '/agenda', slot: 'switch', width: 32, height: 18.4 },
        {
            path: '/pacientes/nuevo',
            slot: 'radio-group-item',
            width: 16,
            height: 16,
        },
        {
            path: '/profesionales/nuevo',
            slot: 'checkbox',
            width: 16,
            height: 16,
        },
    ]) {
        test(`${slot} on ${path}`, async ({ page }) => {
            await page.goto(path);
            await page.waitForLoadState('networkidle');

            const control = page.locator(`[data-slot="${slot}"]`).first();
            await expect(control).toBeVisible();

            const geometry = await control.evaluate((element) => {
                // `elementFromPoint` only sees the viewport.
                element.scrollIntoView({ block: 'center' });
                const rect = element.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                // 21px from the center in each direction: outside the
                // visible box, inside a 44px target centered on it.
                const probes = [
                    [centerX - 21, centerY],
                    [centerX + 21, centerY],
                    [centerX, centerY - 21],
                    [centerX, centerY + 21],
                ];
                return {
                    width: rect.width,
                    height: rect.height,
                    missedProbes: probes.filter(([x, y]) => {
                        const hit = document.elementFromPoint(x, y);
                        return !(hit && element.contains(hit));
                    }).length,
                };
            });

            expect(geometry.width).toBeCloseTo(width, 0);
            expect(geometry.height).toBeCloseTo(height, 0);
            expect(geometry.missedProbes).toBe(0);
        });
    }
});

// A toggle's 44px hit area reaches past its drawing, so options laid out
// side by side or stacked must leave it room: a tap anywhere on an option's
// own `<label>` has to land on that option, never on its neighbor's `::after`.
test.describe('toggle hit areas never cover a neighboring option', () => {
    test.use({ storageState: STORAGE_STATE, hasTouch: true, isMobile: true });

    for (const { path, opener } of [
        { path: '/pacientes/nuevo' },
        { path: '/profesionales/nuevo' },
        { path: '/disponibilidad', opener: 'Agregar excepción' },
    ]) {
        test(`labels on ${path} only reach their own control`, async ({
            page,
        }) => {
            await page.goto(path);
            await page.waitForLoadState('networkidle');
            if (opener) {
                await page.getByRole('button', { name: opener }).click();
            }
            await expect(
                page
                    .locator(
                        'label:has([data-slot="radio-group-item"], [data-slot="checkbox"])',
                    )
                    .first(),
            ).toBeVisible();

            const stolenTaps = await page.evaluate(() => {
                const offenders: string[] = [];
                const controls = document.querySelectorAll<HTMLElement>(
                    'label [data-slot="switch"], label [data-slot="checkbox"], label [data-slot="radio-group-item"]',
                );
                for (const control of controls) {
                    const label = control.closest('label');
                    if (!label || !control.checkVisibility()) {
                        continue;
                    }
                    label.scrollIntoView({ block: 'center' });
                    const rect = label.getBoundingClientRect();
                    const xs = [rect.left + 1, rect.right - 1];
                    const ys = [rect.top + 1, rect.bottom - 1];
                    for (const x of xs) {
                        for (const y of ys) {
                            const hit = document.elementFromPoint(x, y);
                            if (!hit || !label.contains(hit)) {
                                offenders.push(
                                    `"${label.textContent?.trim()}" at (${x.toFixed(0)}, ${y.toFixed(0)}) hit ${hit?.closest('label')?.textContent?.trim() ?? hit?.tagName ?? 'nothing'}`,
                                );
                            }
                        }
                    }
                }
                return offenders;
            });

            expect(stolenTaps, stolenTaps.join('\n')).toEqual([]);
        });
    }
});

test.describe('the touch-target exemption stays narrow', () => {
    test.use({ expectedIssues: ANONYMOUS_SESSION_PROBE_ISSUES });

    test('only inline text links on /login carry it', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        // `networkidle` can resolve while the route still shows its pending
        // skeleton; the exemption lives on the form's links.
        await expect(
            page.getByRole('link', { name: 'Registrate' }),
        ).toBeVisible();

        const exemptElements = await page.evaluate(() =>
            Array.from(document.querySelectorAll('.touch-target-exempt')).map(
                (element) => ({
                    tag: element.tagName.toLowerCase(),
                    text: element.textContent?.trim() ?? '',
                }),
            ),
        );

        expect(exemptElements.length).toBeGreaterThan(0);
        for (const element of exemptElements) {
            expect(element.tag).toBe('a');
        }
        expect(
            exemptElements.some((element) => element.text === 'Registrate'),
        ).toBe(true);
    });
});

// `/reservar/$slug` sits under `_open`, which never probes the session, so no
// anonymous 401 on GET /me is expected here.
test.describe('booking select truncation at scaled font', () => {
    test('specialty select truncates a long value with an ellipsis instead of hard-cutting it', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.goto('/reservar/clinica-modelo');
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => {
            document.documentElement.style.fontSize = '24px';
        });

        const specialtyTrigger = page.getByLabel('Especialidad');
        await expect(specialtyTrigger).toBeVisible();

        const truncation = await specialtyTrigger.evaluate((trigger) => {
            const valueSpan = trigger.querySelector(
                '[data-slot="select-value"]',
            );
            if (!valueSpan) {
                return null;
            }
            const style = getComputedStyle(valueSpan);
            return {
                textOverflow: style.textOverflow,
                display: style.display,
                scrollWidth: valueSpan.scrollWidth,
                clientWidth: valueSpan.clientWidth,
                text: valueSpan.textContent,
            };
        });

        expect(
            truncation,
            'expected the specialty select trigger to render a truncatable value element',
        ).not.toBeNull();
        expect(truncation?.textOverflow).toBe('ellipsis');
        expect(truncation?.display).toBe('block');
        expect(
            truncation && truncation.scrollWidth > truncation.clientWidth,
            `expected "${truncation?.text}" to overflow its container (scrollWidth=${truncation?.scrollWidth}, clientWidth=${truncation?.clientWidth}) so the ellipsis actually kicks in`,
        ).toBe(true);
    });
});
