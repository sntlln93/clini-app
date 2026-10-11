import { devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import base from '../playwright.config';

// Throwaway browser checks in `e2e/verify/` (gitignored, and excluded from the
// main config so a full run never picks them up). Run inside the `e2e` compose
// service, never with a host `npx` — see the `verify` skill.
const root = fileURLToPath(new URL('..', import.meta.url));

export default {
    ...base,
    testDir: '.',
    projects: [
        { name: 'setup', testMatch: /.*\.setup\.ts$/ },
        {
            name: 'verify',
            testMatch: /verify\/.*\.spec\.ts$/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
    ],
    // The main config's server `cwd`s are relative to the repo root; this file lives one level down.
    webServer: Array.isArray(base.webServer)
        ? base.webServer.map((server) => ({
              ...server,
              cwd: `${root}${server.cwd ?? ''}`,
          }))
        : base.webServer,
};
