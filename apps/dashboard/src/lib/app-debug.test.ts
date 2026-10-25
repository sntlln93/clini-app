import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAppDebug } from './app-debug';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('isAppDebug', () => {
    it('follows an explicit VITE_APP_DEBUG', () => {
        vi.stubEnv('VITE_APP_DEBUG', 'true');
        vi.stubEnv('DEV', false);
        expect(isAppDebug()).toBe(true);

        vi.stubEnv('VITE_APP_DEBUG', 'false');
        vi.stubEnv('DEV', true);
        expect(isAppDebug()).toBe(false);
    });

    it('falls back to the dev server when VITE_APP_DEBUG is unset, so a production build is off', () => {
        vi.stubEnv('VITE_APP_DEBUG', '');
        vi.stubEnv('DEV', false);
        expect(isAppDebug()).toBe(false);

        vi.stubEnv('DEV', true);
        expect(isAppDebug()).toBe(true);
    });
});
