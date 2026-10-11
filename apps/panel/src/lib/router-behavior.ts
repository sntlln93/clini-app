// Shared by `createRouter` in `main.tsx` and the tests that pin this behavior.
export const routerBehavior = {
    defaultPendingMs: 0,
    // Without it, every render the router commits scrolls the window to the top,
    // including the reload `router.invalidate()` runs after a mutation (#279).
    scrollRestoration: true,
} as const;
