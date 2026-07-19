import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();

    document.body.innerHTML = '';
    localStorage.clear();
    sessionStorage.clear();
});

beforeEach(() => {
    vi.resetModules();
});

// jsdom does not implement ResizeObserver, required by several shadcn/Radix components
vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        unobserve() {}
        disconnect() {}
    },
);

// jsdom does not implement scrollIntoView (required by cmdk's command list)
// nor the pointer-capture APIs Radix Select needs to open its listbox
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.releasePointerCapture = vi.fn();

// jsdom does not implement matchMedia, required by responsive components
// (e.g. a mobile-breakpoint hook)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
