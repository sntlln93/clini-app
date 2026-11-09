import type { Content } from 'pdfmake/interfaces';

/**
 * pdfmake's own typeface, registered beside Outfit (`loadPdfMake()`): it
 * draws Greek, Cyrillic and the wider Latin that Outfit's cut leaves out.
 */
export const FALLBACK_FONT = 'Roboto';

// The code points of Outfit's Latin cut (`fonts.ts`), as @fontsource's
// `unicode-range` declares them; pdfmake falls back to no other font, so a
// character outside them would print as nothing.
const OUTFIT_RANGES: [number, number][] = [
    [0x0000, 0x00ff],
    [0x0131, 0x0131],
    [0x0152, 0x0153],
    [0x02bb, 0x02bc],
    [0x02c6, 0x02c6],
    [0x02da, 0x02da],
    [0x02dc, 0x02dc],
    [0x0304, 0x0304],
    [0x0308, 0x0308],
    [0x0329, 0x0329],
    [0x2000, 0x206f],
    [0x20ac, 0x20ac],
    [0x2122, 0x2122],
    [0x2191, 0x2191],
    [0x2193, 0x2193],
    [0x2212, 0x2212],
    [0x2215, 0x2215],
    [0xfeff, 0xfeff],
    [0xfffd, 0xfffd],
];

/** Whether Outfit can draw every character of a text. */
export function outfitDraws(text: string): boolean {
    return Array.from(text).every((character) => {
        const point = character.codePointAt(0) ?? 0;

        return OUTFIT_RANGES.some(([from, to]) => point >= from && point <= to);
    });
}

function textRun(run: Content): Content {
    return typeof run === 'string'
        ? outfitDraws(run)
            ? run
            : { text: run, font: FALLBACK_FONT }
        : withFallbackFont(run);
}

/**
 * Content whose texts Outfit can't draw set in the fallback typeface, node by
 * node, so a clinical note with «≥» or «β» prints whole and the rest keeps
 * the theme's typeface (#432).
 */
export function withFallbackFont(content: Content): Content {
    if (typeof content === 'string') {
        return textRun(content);
    }

    if (Array.isArray(content)) {
        return content.map(withFallbackFont);
    }

    if (content === null || typeof content !== 'object') {
        return content;
    }

    const node = { ...content } as Record<string, unknown>;

    if (typeof node.text === 'string') {
        if (node.font === undefined && !outfitDraws(node.text)) {
            node.font = FALLBACK_FONT;
        }
    } else if (Array.isArray(node.text)) {
        node.text = (node.text as Content[]).map(textRun);
    }

    for (const key of ['stack', 'columns', 'ul', 'ol']) {
        if (Array.isArray(node[key])) {
            node[key] = (node[key] as Content[]).map(withFallbackFont);
        }
    }

    const table = node.table as { body?: Content[][] } | undefined;

    if (table?.body) {
        node.table = {
            ...table,
            body: table.body.map((row) => row.map(withFallbackFont)),
        };
    }

    return node as unknown as Content;
}
