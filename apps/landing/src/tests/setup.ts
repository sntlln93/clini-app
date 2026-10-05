import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { resetDocument } from '@/tests/reset-document';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();

    resetDocument();
    document.documentElement.classList.remove('dark');
    localStorage.clear();
});
