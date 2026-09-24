import invariant from 'tiny-invariant';

/*
 * Both functions are copied from `pg` 8.23.0 (`lib/utils.js`), typed and left as they are.
 * They cannot be imported: the renderer builds literals too (the grid's context menu),
 * and `pg/lib/utils.js` loads `pg-types`, whose `postgres-bytea` reads `Buffer` on import —
 * measured, `Buffer is not defined` in the renderer.
 */

/**
 * Quote an identifier the way PostgreSQL does: a `"` inside a name is doubled.
 * The one addition to `pg`'s copy is the invariant: `""` names nothing, and the dialect contract refuses it.
 */
export function escapeIdentifier(str: string): string {
  invariant(str.length > 0, 'An empty identifier cannot be escaped');

  return '"' + str.replace(/"/g, '""') + '"';
}

/** Quote a string as one value: a text holding a backslash goes in an `E'…'` literal, read the same whatever `standard_conforming_strings` says. */
export function escapeLiteral(str: string): string {
  let hasBackslash = false;
  let escaped = "'";

  if (str == null) {
    return "''";
  }

  if (typeof str !== 'string') {
    return "''";
  }

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "'") {
      escaped += c + c;
    } else if (c === '\\') {
      escaped += c + c;
      hasBackslash = true;
    } else {
      escaped += c;
    }
  }

  escaped += "'";

  if (hasBackslash === true) {
    escaped = ' E' + escaped;
  }

  return escaped;
}
