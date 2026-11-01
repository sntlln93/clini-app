import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withMinimumDuration } from './minimum-duration';

describe('withMinimumDuration', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('holds a quick answer until the minimum has passed', async () => {
        const settled = vi.fn();
        void withMinimumDuration(Promise.resolve('ok'), 1000).then(settled);

        await vi.advanceTimersByTimeAsync(999);
        expect(settled).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(settled).toHaveBeenCalledWith('ok');
    });

    it('holds a quick failure too, then rejects with it', async () => {
        const error = new Error('caído');
        const settled = withMinimumDuration(Promise.reject(error), 1000);
        const rejected = vi.fn();
        settled.catch(rejected);

        await vi.advanceTimersByTimeAsync(999);
        expect(rejected).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(rejected).toHaveBeenCalledWith(error);
    });

    it('lets a slow answer through as soon as it arrives', async () => {
        const settled = vi.fn();
        let resolve!: (value: string) => void;
        void withMinimumDuration(
            new Promise<string>((r) => (resolve = r)),
            1000,
        ).then(settled);

        await vi.advanceTimersByTimeAsync(3000);
        resolve('tarde');
        await vi.advanceTimersByTimeAsync(0);

        expect(settled).toHaveBeenCalledWith('tarde');
    });
});
