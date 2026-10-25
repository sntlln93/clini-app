/**
 * Whether error pages show the exact error instead of the friendly page
 * (#304), the frontend's counterpart of the API's `APP_DEBUG`. An explicit
 * `VITE_APP_DEBUG` (a build arg) wins; unset, only the dev server shows it,
 * so a production build never does unless it's asked to.
 */
export function isAppDebug(): boolean {
    const flag = import.meta.env.VITE_APP_DEBUG as string | undefined;

    if (flag === 'true' || flag === 'false') {
        return flag === 'true';
    }

    return import.meta.env.DEV;
}
