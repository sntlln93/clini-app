/** True when every listed numeric key of every row is 0 (or there are no rows) — the chart then shows its empty state instead of a flat line. */
export function isAllZero<TRow>(
    rows: TRow[],
    keys: ReadonlyArray<keyof TRow>,
): boolean {
    return rows.every((row) => keys.every((key) => row[key] === 0));
}
