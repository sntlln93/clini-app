/**
 * pdfmake with its fonts, for a PDF built in the browser (ADR 0023): Roboto,
 * its own, and Outfit, the theme's (`PDF_FONT`). They weigh about 2 MB, so
 * they load only when a PDF is asked for, in chunks of their own.
 */
export async function loadPdfMake() {
    const [pdfMakeModule, fontsModule, { outfitFontContainer }] =
        await Promise.all([
            import('pdfmake/build/pdfmake'),
            import('pdfmake/build/vfs_fonts'),
            import('./fonts'),
        ]);
    // Both are UMD bundles: Vite hands their exports back as `default`.
    const pdfMake = pdfMakeModule.default;
    pdfMake.addVirtualFileSystem(fontsModule.default);
    pdfMake.addVirtualFileSystem(outfitFontContainer.vfs);
    pdfMake.addFonts(outfitFontContainer.fonts);

    return pdfMake;
}
