/** Bytes as the hexadecimal digits both servers read back, two per byte. */
export function toHexDigits(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) =>
    byte.toString(16).toUpperCase().padStart(2, '0')
  ).join('');
}
