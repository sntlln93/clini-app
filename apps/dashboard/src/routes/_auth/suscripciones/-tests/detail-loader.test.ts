import { describe, expect, it, vi } from 'vitest';
import { Route } from '../$id';

type LoaderArgs = {
    context: {
        queryClient: {
            ensureQueryData: (options: unknown) => Promise<unknown>;
        };
    };
    params: { id: number };
    deps: Record<string, unknown>;
};

const NOT_FOUND = { kind: 'not-found' };
const VALIDATION = { kind: 'validation' };

/** The detail read fails late with a 404; any other read fails at once with the `exists:` 422. */
function failingQueryClient() {
    const ensureQueryData = vi.fn((options: unknown) => {
        const key = (options as { queryKey: unknown[] }).queryKey;
        const isDetail = key[1] === 'detail';

        return isDetail
            ? new Promise((_, reject) =>
                  setTimeout(() => reject(NOT_FOUND), 10),
              )
            : Promise.reject(VALIDATION);
    });

    return { ensureQueryData };
}

describe('/suscripciones/$id loader', () => {
    it('fails an unknown id with the detail 404, before requesting the events', async () => {
        const queryClient = failingQueryClient();
        const run = Route.options.loader as unknown as (
            args: LoaderArgs,
        ) => Promise<unknown>;

        await expect(
            run({
                context: { queryClient },
                params: { id: 999 },
                deps: { eventsPage: 1 },
            }),
        ).rejects.toBe(NOT_FOUND);
        expect(queryClient.ensureQueryData).toHaveBeenCalledTimes(1);
    });
});
