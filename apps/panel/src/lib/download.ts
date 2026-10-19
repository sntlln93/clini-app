/**
 * Hands a file the API returned to the browser as a download. The API lives
 * on another origin and needs the session's CSRF pipeline, so the file comes
 * through axios as a Blob rather than from a plain link to the API; the
 * object URL lives only until the click is handled.
 */
export function saveFile(data: Blob, filename: string): void {
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
