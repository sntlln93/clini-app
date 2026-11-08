/**
 * The same folding as the API's `App\Support\FoldedText::fold()`: lowercase,
 * the Spanish accents and ñ dropped, each run of whitespace as one space. A
 * search the API answered by folded text is found here exactly where it
 * matched, so the page can highlight it.
 */
const UNACCENTED: Record<string, string> = {
    á: 'a',
    é: 'e',
    í: 'i',
    ó: 'o',
    ú: 'u',
    ü: 'u',
    ñ: 'n',
};

function foldChar(char: string): string {
    return [...char.toLowerCase()]
        .map((lower) => UNACCENTED[lower] ?? lower)
        .join('');
}

export function foldText(text: string): string {
    return [...text].map(foldChar).join('').replace(/\s+/g, ' ').trim();
}

/** Each `[start, end)` range of `text` whose folded form is the folded `query`, left to right, never overlapping. */
export function matchRanges(
    text: string,
    query: string,
): Array<[number, number]> {
    const needle = foldText(query);
    if (needle === '') {
        return [];
    }

    // The folded text, with the index in `text` each of its characters came from.
    let folded = '';
    const origin: number[] = [];
    let index = 0;
    for (const char of text) {
        const isSpace = /\s/.test(char);
        if (!isSpace || !folded.endsWith(' ')) {
            for (const piece of isSpace ? ' ' : foldChar(char)) {
                folded += piece;
                origin.push(index);
            }
        }
        index += char.length;
    }

    const ranges: Array<[number, number]> = [];
    let from = folded.indexOf(needle);
    while (from !== -1) {
        const last = from + needle.length - 1;
        const lastChar = text.codePointAt(origin[last]) ?? 0;
        ranges.push([origin[from], origin[last] + (lastChar > 0xffff ? 2 : 1)]);
        from = folded.indexOf(needle, from + needle.length);
    }

    return ranges;
}
