import { describe, expect, it } from 'vitest';
import { pageHead } from './page-head';

const page = {
    path: '/contacto',
    title: 'Contacto · Clini',
    description: 'Escribinos.',
} as const;

describe('pageHead', () => {
    it('declares the canonical and og:url as absolute URLs', () => {
        expect(pageHead(page, 'https://clini.example')).toEqual({
            meta: [
                { title: 'Contacto · Clini' },
                { name: 'description', content: 'Escribinos.' },
                { property: 'og:title', content: 'Contacto · Clini' },
                { property: 'og:description', content: 'Escribinos.' },
                {
                    property: 'og:url',
                    content: 'https://clini.example/contacto',
                },
            ],
            links: [
                { rel: 'canonical', href: 'https://clini.example/contacto' },
            ],
        });
    });

    it('leaves the canonical and og:url out without the origin', () => {
        expect(pageHead(page, '')).toEqual({
            meta: [
                { title: 'Contacto · Clini' },
                { name: 'description', content: 'Escribinos.' },
                { property: 'og:title', content: 'Contacto · Clini' },
                { property: 'og:description', content: 'Escribinos.' },
            ],
            links: [],
        });
    });
});
