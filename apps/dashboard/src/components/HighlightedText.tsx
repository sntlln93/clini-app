import { matchRanges } from '@/lib/text-match';
import type { ReactNode } from 'react';

type HighlightedTextProps = {
    text: string;
    /** The search to mark; neither case nor accents count, as in the API. */
    query: string;
};

/** `text` with every part that matches `query` marked. */
export function HighlightedText({ text, query }: HighlightedTextProps) {
    const ranges = matchRanges(text, query);
    if (ranges.length === 0) {
        return text;
    }

    const parts: ReactNode[] = [];
    let cursor = 0;
    for (const [start, end] of ranges) {
        parts.push(text.slice(cursor, start));
        parts.push(
            <mark
                key={start}
                className="rounded-sm bg-accent text-accent-foreground"
            >
                {text.slice(start, end)}
            </mark>,
        );
        cursor = end;
    }
    parts.push(text.slice(cursor));

    return <>{parts}</>;
}
