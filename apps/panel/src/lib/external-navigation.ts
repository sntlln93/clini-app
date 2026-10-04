/** Full-page navigation to another origin (e.g. a payment checkout); isolated so tests can mock it, since jsdom doesn't implement navigation. */
export function navigateToExternalUrl(url: string): void {
    window.location.assign(url);
}
