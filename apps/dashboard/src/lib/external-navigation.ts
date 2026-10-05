/** Full-page navigation to another origin (e.g. a payment checkout); isolated so tests can mock it, since jsdom doesn't implement navigation. */
export function navigateToExternalUrl(url: string): void {
    window.location.assign(url);
}

/** Full reload of the current page (e.g. to pick up a fresh CSRF cookie); isolated for the same reason as above. */
export function reloadPage(): void {
    window.location.reload();
}
