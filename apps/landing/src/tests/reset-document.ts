/**
 * Resets the jsdom `document` to a pristine state between tests.
 *
 * Base UI applies a document-level scroll lock while a modal (`Dialog`,
 * `Select`, `Popover`, ...) is open: it writes inline styles on `<body>` and
 * `<html>`, sets a `data-base-ui-scroll-locked` attribute on `<html>`, and —
 * for components backed by its `ScrollArea`/`List` (e.g. `Select`'s listbox)
 * — injects a `<style data-href="base-ui-disable-scrollbar">` into `<head>`
 * via React's stylesheet-hoisting.
 *
 * Those effects only unwind on a normal open -> closed transition; if the
 * component unmounts while still open (as `@testing-library/react`'s
 * `cleanup()` does), they never do — and with Vitest's `--no-isolate`, where
 * files in the same worker fork share one `document`, they leak into
 * whichever test file runs next.
 *
 * `document.body.innerHTML = ''` clears children but never touches `<body>`'s
 * own attributes nor anything under `<head>`, so this helper does both, on
 * top of the same child-clearing behavior.
 */
export function resetDocument(): void {
    document.body.innerHTML = '';
    document.body.removeAttribute('style');

    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-base-ui-scroll-locked');

    document.head
        .querySelectorAll('style[data-href="base-ui-disable-scrollbar"]')
        .forEach((node) => node.remove());
}
