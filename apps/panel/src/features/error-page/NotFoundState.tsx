import { ErrorPage } from './ErrorPage';

/** Rendered for any URL no route matches (mistyped, or an old link), inside the panel chrome. */
export function NotFoundState() {
    return <ErrorPage variant="not_found" />;
}

/** The router's last resort, when nothing with a layout caught the miss. */
export function NotFoundPage() {
    return <ErrorPage variant="not_found" fullPage />;
}
