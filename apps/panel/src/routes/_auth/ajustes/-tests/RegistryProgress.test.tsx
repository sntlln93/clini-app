import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    REGISTRY_PROGRESS_MESSAGES,
    REGISTRY_PROGRESS_MIN_MS,
    RegistryProgress,
} from '../-components/RegistryProgress';

describe('RegistryProgress', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows every step of the lookup within the minimum wait, and the slow notice only after it', () => {
        render(<RegistryProgress />);
        const seen = new Set<string>();
        const step = 100;

        for (
            let elapsed = 0;
            elapsed < REGISTRY_PROGRESS_MIN_MS;
            elapsed += step
        ) {
            seen.add(screen.getByRole('status').textContent ?? '');
            act(() => vi.advanceTimersByTime(step));
        }

        expect([...seen]).toEqual(REGISTRY_PROGRESS_MESSAGES.slice(0, 3));

        act(() => vi.advanceTimersByTime(1000));
        expect(screen.getByRole('status').textContent).toBe(
            REGISTRY_PROGRESS_MESSAGES[3],
        );
    });

    it('writes its steps without trailing dots', () => {
        for (const message of REGISTRY_PROGRESS_MESSAGES) {
            expect(message).not.toMatch(/[.…]$/);
        }
    });
});
