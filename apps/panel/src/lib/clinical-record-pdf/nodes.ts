import type { Content } from 'pdfmake/interfaces';

/**
 * A piece of content with `properties` set on it and on every node inside
 * it (stacks, columns, text runs, table cells), as `keepTitlesWithContent`
 * needs them: pdfmake hands it every node on its own.
 */
export function withEveryNode(
    content: Content,
    properties: Record<string, unknown>,
): Content {
    if (Array.isArray(content)) {
        return content.map((child) => withEveryNode(child, properties));
    }

    if (content === null || typeof content !== 'object') {
        return content;
    }

    const node = { ...content, ...properties } as Record<string, unknown>;

    for (const key of ['stack', 'columns', 'text']) {
        if (Array.isArray(node[key])) {
            node[key] = (node[key] as Content[]).map((child) =>
                withEveryNode(child, properties),
            );
        }
    }

    const table = node.table as { body?: Content[][] } | undefined;

    if (table?.body) {
        node.table = {
            ...table,
            body: table.body.map((row) =>
                row.map((cell) => withEveryNode(cell, properties)),
            ),
        };
    }

    return node as unknown as Content;
}

/**
 * The style that marks the header's and the footer's nodes: pdfmake lists
 * them among a title's following nodes, but they are no content of it. Not
 * a style of the document's, so it changes nothing drawn.
 */
export const PAGE_CHROME = 'pageChrome';

/** A heading: kept with what it titles (`keepTitlesWithContent`). */
export function asHeadline(content: Content, level = 2): Content {
    return withEveryNode(content, { headlineLevel: level });
}

/** The header's or footer's content, which a title never waits for. */
export function asPageChrome(content: Content): Content {
    return withEveryNode(content, { style: PAGE_CHROME });
}
