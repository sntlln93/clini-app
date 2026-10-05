/** The operator's note on an audit row (`reason` for suspend/block, `note` for grace extensions), if any. */
export function auditNote(metadata: Record<string, unknown>): string | null {
    for (const key of ['reason', 'note']) {
        const value = metadata[key];
        if (typeof value === 'string' && value.trim() !== '') {
            return value;
        }
    }

    return null;
}
