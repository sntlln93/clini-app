import { mapToAppError } from '@/lib/api-errors';
import type { ErrorCode } from '@/lib/error-codes';

export type Range = {
    start: string;
    end: string;
};

export type MergeProposal = {
    merged: Range;
    absorbed: Range[];
};

function isRange(value: unknown): value is Range {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as Record<string, unknown>).start === 'string' &&
        typeof (value as Record<string, unknown>).end === 'string'
    );
}

function isRangeList(value: unknown): value is Range[] {
    return Array.isArray(value) && value.every(isRange);
}

/**
 * Narrows a mutation error into a `MergeProposal` when it is the given
 * merge-required `BusinessError` with a well-formed `context`; `null` for
 * any other error (including a malformed context), so callers can fall
 * through to the regular error-handling path.
 */
export function readMergeProposal(
    error: unknown,
    code: ErrorCode,
): MergeProposal | null {
    const appError = mapToAppError(error);

    if (appError.kind !== 'business' || appError.code !== code) {
        return null;
    }

    const { merged, absorbed } = appError.context;

    if (!isRange(merged) || !isRangeList(absorbed)) {
        return null;
    }

    return { merged, absorbed };
}

function formatRange(range: Range): string {
    return `${range.start} a ${range.end}`;
}

export function mergeSlotDescription(proposal: MergeProposal): string {
    const { merged, absorbed } = proposal;
    const mergedRange = formatRange(merged);

    if (absorbed.length === 1) {
        const [existing] = absorbed;
        return `Ya tenés un horario de ${existing.start} a ${existing.end} ese día. Si continuás, queda un solo horario de ${mergedRange}.`;
    }

    const lista = absorbed.map(formatRange).join(', ');
    return `Ya tenés ${absorbed.length} horarios ese día (${lista}). Si continuás, quedan combinados en un solo horario de ${mergedRange}.`;
}
