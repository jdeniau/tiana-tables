import invariant from 'tiny-invariant';
import type { SqlBoundValue, SqlBoundValues } from '../../types';

/** A statement in the form mysql2 formats it: `?` placeholders and their values in order. */
interface PositionalQuery {
  sql: string;
  values: SqlBoundValue[];
}

/**
 * A quoted run, copied as it is — a doubled quote is two runs side by side —,
 * or a `:name` placeholder, read as `dialect.contract.test.ts` reads it.
 */
const QUOTED_OR_PLACEHOLDER =
  /(`[^`]*`|'[^']*'|"[^"]*")|:([a-zA-Z][a-zA-Z0-9_]*)/g;

/**
 * Rewrite `:name` placeholders into the `?` that mysql2 fills in order.
 *
 * mysql2's own `namedPlaceholders` reads a `:name` or a `?` inside a backtick identifier,
 * and every value after it slides one place: an UPDATE then targets another row.
 * A name used twice binds its value twice; a name the values lack throws, rather than binding NULL.
 */
export function toPositional(
  sql: string,
  values: SqlBoundValues
): PositionalQuery {
  const ordered: SqlBoundValue[] = [];

  const positional = sql.replace(
    QUOTED_OR_PLACEHOLDER,
    (match, quoted: string | undefined, name: string | undefined) => {
      if (quoted !== undefined || name === undefined) {
        return match;
      }

      invariant(name in values, `No value bound to ":${name}"`);
      ordered.push(values[name]);

      return '?';
    }
  );

  return { sql: positional, values: ordered };
}
