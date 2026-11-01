import { useEffect, useState } from 'react';

/**
 * Steps through `messages` every `intervalMs` while mounted, and stays on
 * the last one: a long wait shows what is happening without looping back
 * as if it had started over. Mount it only while the wait lasts, so each
 * wait starts from the first message.
 */
export function useProgressMessages(
    messages: readonly string[],
    intervalMs = 2000,
): string {
    const [index, setIndex] = useState(0);
    const last = messages.length - 1;

    useEffect(() => {
        if (index >= last) {
            return;
        }

        const timer = setTimeout(() => setIndex(index + 1), intervalMs);

        return () => clearTimeout(timer);
    }, [index, last, intervalMs]);

    return messages[Math.min(index, last)] ?? '';
}
