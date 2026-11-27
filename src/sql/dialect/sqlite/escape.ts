import invariant from 'tiny-invariant';

/** Quote an identifier: a `"` inside a name is doubled. */
export function escapeIdentifier(identifier: string): string {
  invariant(identifier.length > 0, 'An empty identifier cannot be escaped');

  return `"${identifier.replaceAll('"', '""')}"`;
}

/** Quote a string as one value: SQLite reads no backslash escape, so only `'` is doubled. */
export function escapeLiteral(text: string): string {
  return `'${text.replaceAll("'", "''")}'`;
}
