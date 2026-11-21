/** A scalar the driver answers with and a statement binds back unchanged: NULL, bytes and an object are none. */
export function isStringOrNumber(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}
