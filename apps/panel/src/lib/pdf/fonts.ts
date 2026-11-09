import regular from '@fontsource/outfit/files/outfit-latin-400-normal.woff?inline';
import medium from '@fontsource/outfit/files/outfit-latin-500-normal.woff?inline';
import type { TFontContainer } from 'pdfmake/interfaces';
import { PDF_FONT } from './theme';

/** The base64 payload of a `data:` URL, as pdfmake's virtual file system takes it. */
function base64Of(dataUrl: string): string {
    return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

/**
 * Outfit, the theme's typeface, for pdfmake: its static Latin cuts (regular,
 * and medium for `bold`), inlined into this module so they load only with a
 * PDF, in its chunk (about 48 KB as base64). The Latin cut covers Spanish.
 */
export const outfitFontContainer: TFontContainer = {
    vfs: {
        'Outfit-Regular.woff': base64Of(regular),
        'Outfit-Medium.woff': base64Of(medium),
    },
    fonts: {
        [PDF_FONT]: {
            normal: 'Outfit-Regular.woff',
            bold: 'Outfit-Medium.woff',
            italics: 'Outfit-Regular.woff',
            bolditalics: 'Outfit-Medium.woff',
        },
    },
};
