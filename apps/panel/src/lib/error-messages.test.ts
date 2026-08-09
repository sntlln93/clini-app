import { describe, expect, it } from 'vitest';
import { ERROR_CODE_MESSAGES } from './error-codes';

// Regression guard: every message here is shown verbatim to end users, so it must read like a finished sentence with no backend jargon.
const JARGON_DENYLIST = [
    'transición de estado',
    'null',
    'undefined',
    'http',
    'status code',
    '400',
    '409',
    '422',
    '500',
    'exception',
    'stack',
];

describe('ERROR_CODE_MESSAGES', () => {
    it('is a non-empty, capitalized, period-terminated sentence for every code', () => {
        for (const [code, message] of Object.entries(ERROR_CODE_MESSAGES)) {
            expect(message.length, `${code}: message is empty`).toBeGreaterThan(
                0,
            );
            expect(
                /^[A-ZÁÉÍÓÚÑ]/.test(message),
                `${code}: message does not start with an uppercase letter: "${message}"`,
            ).toBe(true);
            expect(
                message.endsWith('.'),
                `${code}: message does not end with a period: "${message}"`,
            ).toBe(true);
        }
    });

    it('never contains developer jargon', () => {
        for (const [code, message] of Object.entries(ERROR_CODE_MESSAGES)) {
            const lowerMessage = message.toLowerCase();
            for (const term of JARGON_DENYLIST) {
                expect(
                    lowerMessage.includes(term.toLowerCase()),
                    `${code}: message contains developer jargon "${term}": "${message}"`,
                ).toBe(false);
            }
        }
    });
});
