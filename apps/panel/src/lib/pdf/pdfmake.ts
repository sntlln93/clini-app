/**
 * pdfmake with its fonts, for a PDF built in the browser (ADR 0023). They
 * weigh about 2 MB, so they load only when a PDF is asked for, in a chunk of
 * their own.
 */
export async function loadPdfMake() {
    const [pdfMakeModule, fontsModule] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
    ]);
    // Both are UMD bundles: Vite hands their exports back as `default`.
    const pdfMake = pdfMakeModule.default;
    pdfMake.addVirtualFileSystem(fontsModule.default);

    return pdfMake;
}
