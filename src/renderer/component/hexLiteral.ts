/** Shown in place of the bytes a budget left out. */
const ELLIPSIS = '…';

/**
 * Bytes written as the hexadecimal literal a server accepts, `0x` included.
 *
 * Hexadecimal and not text, because nothing here knows how the bytes were
 * written: a `BLOB` holding UTF-8 and one holding a PNG are the same column,
 * and decoding the second would show a wall of replacement characters. The
 * literal is the one form that never claims more than it knows — and it can be
 * pasted back into a query.
 *
 * `maxBytes` bounds what gets turned into text, because a column may hold
 * megabytes and each byte costs two characters. An ellipsis says when it did.
 */
export default function toHexLiteral(
  bytes: Uint8Array,
  maxBytes: number
): string {
  const head = Array.from(bytes.subarray(0, maxBytes), (byte) =>
    byte.toString(16).toUpperCase().padStart(2, '0')
  ).join('');

  return `0x${head}${bytes.length > maxBytes ? ELLIPSIS : ''}`;
}
