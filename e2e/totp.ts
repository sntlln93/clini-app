import { createHmac } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(secret: string): Buffer {
    let bits = '';
    for (const char of secret.replace(/=+$/, '').toUpperCase()) {
        const value = BASE32.indexOf(char);
        if (value === -1) {
            throw new Error(`Not a base32 character: ${char}`);
        }
        bits += value.toString(2).padStart(5, '0');
    }
    const bytes = bits.match(/.{8}/g) ?? [];

    return Buffer.from(bytes.map((byte) => parseInt(byte, 2)));
}

/**
 * The RFC 6238 code an authenticator app shows for `secret` (SHA-1, 6
 * digits, 30-second steps, as the API's `Google2FaService` checks it).
 * `stepOffset` moves to a neighbouring step: the API accepts one either
 * side, and refuses a step it already accepted, so a retried test asks for
 * the next one instead of the code its first attempt spent.
 */
export function totp(secret: string, stepOffset = 0): string {
    const step = Math.floor(Date.now() / 1000 / 30) + stepOffset;
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const hmac = createHmac('sha1', base32Decode(secret))
        .update(counter)
        .digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = hmac.readUInt32BE(offset) & 0x7fffffff;

    return String(binary % 1_000_000).padStart(6, '0');
}
