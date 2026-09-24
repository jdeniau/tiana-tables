import invariant from 'tiny-invariant';
import type { SqlBoundValue, SqlBoundValues } from '../../types';

/** A statement in the form `pg` sends it: numbered placeholders and their values in order. */
interface PositionalQuery {
  text: string;
  values: SqlBoundValue[];
}

/**
 * A quoted run, copied as it is — a doubled quote is two runs side by side —,
 * or a `:name` placeholder, never the second colon of a `::` cast.
 * The name is read as `dialect.contract.test.ts` reads it.
 */
const QUOTED_OR_PLACEHOLDER =
  /('[^']*'|"[^"]*")|(?<!:):([a-zA-Z][a-zA-Z0-9_]*)/g;

/**
 * Rewrite `:name` placeholders into the `$1` that PostgreSQL numbers them with.
 *
 * Only the dialect's own statements come here — the editor's SQL travels as written —
 * so literals and quoted identifiers are all it has to step over.
 * A name used twice binds one `$n`; a name the values lack throws, rather than binding NULL.
 */
export function toPositional(
  sql: string,
  values: SqlBoundValues
): PositionalQuery {
  const numbers = new Map<string, number>();
  const ordered: SqlBoundValue[] = [];

  const text = sql.replace(
    QUOTED_OR_PLACEHOLDER,
    (match, quoted: string | undefined, name: string | undefined) => {
      if (quoted !== undefined || name === undefined) {
        return match;
      }

      invariant(name in values, `No value bound to ":${name}"`);

      let number = numbers.get(name);

      if (number === undefined) {
        ordered.push(values[name]);
        number = ordered.length;
        numbers.set(name, number);
      }

      return `$${number}`;
    }
  );

  return { text, values: ordered };
}
