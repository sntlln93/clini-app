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
// target floor once the coarse-pointer media query applies (`index.css`'s
// `@media (pointer: coarse)` block), except elements explicitly opted out
// via `.touch-target-exempt` (inline text links inside a sentence).
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
            if (rect.width < 44 || rect.height < 44) {
                const accessibleName =
                    element.getAttribute('aria-label') ??
                    element.textContent?.trim() ??
                    '(no accessible name)';
                offenders.push(
                    `<${element.tagName.toLowerCase()}> "${accessibleName}" measured ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}px`,
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

        test('/agenda has no touch target under 44px', async ({ page }) => {
            await page.goto('/agenda');
            await page.waitForLoadState('networkidle');

            const offenders = await collectUndersizedTouchTargets(page);
            expect(offenders, offenders.join('\n')).toEqual([]);
        });
    });
});

test.describe('the touch-target exemption stays narrow', () => {
    test.use({ expectedIssues: ANONYMOUS_SESSION_PROBE_ISSUES });

    test('only inline text links on /login carry it', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

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

test.describe('booking select truncation at scaled font', () => {
    test.use({ expectedIssues: ANONYMOUS_SESSION_PROBE_ISSUES });

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
