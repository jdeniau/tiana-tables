import invariant from 'tiny-invariant';
import type { SqlBoundValue, SqlBoundValues } from '../../types';

/** A statement in the form `pg` sends it: numbered placeholders and their values in order. */
interface PositionalQuery {
  text: string;
  values: SqlBoundValue[];
}

const IDENTIFIER_START = /[A-Za-z_]/;
const IDENTIFIER_PART = /[A-Za-z0-9_$]/;
const PARAMETER_NAME = /^[a-zA-Z][a-zA-Z0-9_]*/;
const DOLLAR_TAG = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/;

/** Where the quoted run opened at `start` ends: the index right after its closing quote. */
function endOfQuoted(sql: string, start: number, backslashEscapes: boolean) {
  const quote = sql[start];
  let i = start + 1;

  while (i < sql.length) {
    if (backslashEscapes && sql[i] === '\\') {
      i += 2;
    } else if (sql[i] === quote) {
      // a doubled quote is the quote itself, and the run goes on
      if (sql[i + 1] !== quote) {
        return i + 1;
      }

      i += 2;
    } else {
      i += 1;
    }
  }

  return sql.length;
}

/** Where a block comment opened at `start` ends; PostgreSQL nests them. */
function endOfBlockComment(sql: string, start: number) {
  let depth = 0;
  let i = start;

  while (i < sql.length) {
    if (sql.startsWith('/*', i)) {
      depth += 1;
      i += 2;
    } else if (sql.startsWith('*/', i)) {
      depth -= 1;
      i += 2;

      if (depth === 0) {
        return i;
      }
    } else {
      i += 1;
    }
  }

  return sql.length;
}

/**
 * Rewrite `:name` placeholders into the `$1` that PostgreSQL numbers them with.
 *
 * A name used twice binds one `$n`. What is not SQL code is copied as is:
 * a literal, a quoted identifier, a comment, a dollar-quoted body, a `::` cast.
 * A name the statement uses and the values lack throws, rather than binding NULL.
 */
export function toPositional(
  sql: string,
  values: SqlBoundValues
): PositionalQuery {
  const numbers = new Map<string, number>();
  const ordered: SqlBoundValue[] = [];
  let text = '';
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const previous = i > 0 ? sql[i - 1] : '';
    let end = i + 1;

    if (char === "'") {
      // `E'…'` is the one literal where a backslash escapes the quote
      const escaped =
        (previous === 'E' || previous === 'e') &&
        !IDENTIFIER_PART.test(sql[i - 2] ?? '');

      end = endOfQuoted(sql, i, escaped);
    } else if (char === '"') {
      end = endOfQuoted(sql, i, false);
    } else if (sql.startsWith('--', i)) {
      const newline = sql.indexOf('\n', i);

      end = newline === -1 ? sql.length : newline;
    } else if (sql.startsWith('/*', i)) {
      end = endOfBlockComment(sql, i);
    } else if (char === '$') {
      const tag = DOLLAR_TAG.exec(sql.slice(i));

      if (tag) {
        const close = sql.indexOf(tag[0], i + tag[0].length);

        end = close === -1 ? sql.length : close + tag[0].length;
      }
    } else if (sql.startsWith('::', i)) {
      end = i + 2;
    } else if (char === ':') {
      const name = PARAMETER_NAME.exec(sql.slice(i + 1))?.[0];

      if (name) {
        invariant(name in values, `No value bound to ":${name}"`);

        let number = numbers.get(name);

        if (number === undefined) {
          ordered.push(values[name]);
          number = ordered.length;
          numbers.set(name, number);
        }

        text += `$${number}`;
        i += 1 + name.length;

        continue;
      }
    } else if (IDENTIFIER_START.test(char)) {
      // a whole word at once, so a `$` inside it is never read as a tag
      while (end < sql.length && IDENTIFIER_PART.test(sql[end])) {
        end += 1;
      }
    }

    text += sql.slice(i, end);
    i = end;
  }

  return { text, values: ordered };
}
