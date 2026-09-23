import invariant from 'tiny-invariant';

/** Quote an identifier the way PostgreSQL does: a `"` inside a name is doubled. */
export function escapeIdentifier(identifier: string): string {
  invariant(identifier.length > 0, 'An empty identifier cannot be escaped');

  return `"${identifier.replaceAll('"', '""')}"`;
}

/**
 * Quote a string as one value, whatever `standard_conforming_strings` says.
 *
 * Written by hand: `pg` is CommonJS, out of the renderer's reach.
 * A text holding a backslash goes in an `E'…'` literal with the backslash doubled,
 * the one form both settings read the same way — as `pg`'s own `escapeLiteral` does.
 */
export function escapeLiteral(text: string): string {
  const quoted = `'${text.replaceAll("'", "''").replaceAll('\\', '\\\\')}'`;

  return text.includes('\\') ? `E${quoted}` : quoted;
}
