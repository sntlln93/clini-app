import { describe, expect, it } from 'vitest';

import { maskClock, parseClock, stepClock } from './clock-text';

describe('maskClock', () => {
    it.each([
        ['9', '9'],
        ['93', '93'],
        ['930', '9:30'],
        ['173', '17:3'],
        ['0930', '09:30'],
        ['09305', '09:30'],
        ['9:3', '9:3'],
        ['09:30', '09:30'],
        ['9a:3b', '9:3'],
        ['', ''],
    ])('keeps «%s» as «%s»', (raw, masked) => {
        expect(maskClock(raw)).toBe(masked);
    });
});

describe('parseClock', () => {
    it.each([
        ['9', '09:00'],
        ['14', '14:00'],
        ['930', '09:30'],
        ['1745', '17:45'],
        ['9:3', '09:30'],
        ['09:05', '09:05'],
        ['0:00', '00:00'],
    ])('reads «%s» as %s', (text, clock) => {
        expect(parseClock(text)).toBe(clock);
    });

    it.each(['', ':', ':30', '24', '2400', '12:60', '99'])(
        'rejects «%s»',
        (text) => {
            expect(parseClock(text)).toBeNull();
        },
    );
});

describe('stepClock', () => {
    it('moves forward and back by the given minutes', () => {
        expect(stepClock('09:00', 15)).toBe('09:15');
        expect(stepClock('09:00', -15)).toBe('08:45');
    });

    it('stays inside the day', () => {
        expect(stepClock('00:05', -15)).toBe('00:00');
        expect(stepClock('23:50', 15)).toBe('23:59');
    });
});
