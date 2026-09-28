/** `null` or `undefined`: what the drivers and the grid both read as no value. */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}
