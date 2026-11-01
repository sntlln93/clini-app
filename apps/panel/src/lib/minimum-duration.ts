/**
 * Settles like `promise`, but never before `ms` have passed: a wait that
 * walks the user through its steps (#380) shows every step even when the
 * answer comes first. A failure waits too, so both read the same.
 */
export async function withMinimumDuration<T>(
    promise: Promise<T>,
    ms: number,
): Promise<T> {
    const [result] = await Promise.allSettled([
        promise,
        new Promise((resolve) => setTimeout(resolve, ms)),
    ]);

    if (result.status === 'rejected') {
        throw result.reason;
    }

    return result.value;
}
