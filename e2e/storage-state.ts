// Lives apart from `auth.setup.ts` because Playwright forbids test-file-to-test-file
// imports, and `auth.setup.ts` is matched by the `setup` project's `testMatch`.
export const STORAGE_STATE = 'e2e/.auth/panel.json'
