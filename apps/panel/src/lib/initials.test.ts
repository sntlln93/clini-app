import { describe, expect, it } from 'vitest';
import { initialsOf } from './initials';

describe('initialsOf', () => {
    it('takes the first letter of the first two words', () => {
        expect(initialsOf('ana maría pérez')).toBe('AM');
    });

    it('skips titles such as "Dr." and repeated spaces', () => {
        expect(initialsOf('Dra.  Lucía   Gómez')).toBe('LG');
    });

    it('is empty for a blank name', () => {
        expect(initialsOf('   ')).toBe('');
    });
});
