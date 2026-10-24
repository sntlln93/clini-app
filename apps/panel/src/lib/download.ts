/**
 * Saves a file the panel built (a PDF, or the JSON the API answered) as a
 * download: the API answers data, never a file (ADR 0023). The object URL
 * lives only until the click is handled.
 */
export function saveFile(data: Blob, filename: string): void {
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
