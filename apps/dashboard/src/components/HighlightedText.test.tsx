import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HighlightedText } from './HighlightedText';

describe('HighlightedText', () => {
    it('marks each match and keeps the rest of the text as is', () => {
        const { container } = render(
            <HighlightedText
                text="Cardiología cardiovascular"
                query="CARDIO"
            />,
        );

        expect(container.textContent).toBe('Cardiología cardiovascular');
        expect(
            [...container.querySelectorAll('mark')].map(
                (mark) => mark.textContent,
            ),
        ).toEqual(['Cardio', 'cardio']);
    });

    it('renders the plain text without a search or a match', () => {
        for (const query of ['', 'trauma']) {
            const { container } = render(
                <HighlightedText text="Pediatría" query={query} />,
            );

            expect(container.innerHTML).toBe('Pediatría');
        }
    });
});
