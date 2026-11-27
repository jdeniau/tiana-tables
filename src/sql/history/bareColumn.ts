import { isReservedKeyword } from '../keywords';
import { unquote } from '../tableName';

/** what a shape holds besides names: punctuation, operators, the `?` of a value */
const NOT_A_NAME = /^[^\p{L}_`"[]/u;

/** the words of a shape, in lower case like every name here */
export function wordsOf(shape: string): Array<string> {
  return shape.split(' ').map((word) => unquote(word).toLowerCase());
}

/** the tables aliases stand for, in lower case like every name here */
export function tablesOf(aliases: Record<string, string>): Set<string> {
  return new Set(Object.values(aliases).map((table) => table.toLowerCase()));
}

/** the comparisons that make a reserved word before them a column: `WHERE date > ?`, unlike `DATE '2026-01-01'` */
const COMPARISON = /^(?:[<>=!]+|in|is|like|ilike|between)$/;

/** whether a clause names a column without its table, `written` holding its words as the shape writes them */
export function namesBareColumn(
  words: ReadonlyArray<string>,
  tables: ReadonlySet<string>,
  written: ReadonlyArray<string>
): boolean {
  return words.some(
    (_, index) =>
      // `date` may be the keyword of `DATE '2026-01-01'`, `` `date` `` is a column
      (!isReservedKeyword(written[index] ?? '') || isCompared(words, index)) &&
      isBareName(words, index, tables)
  );
}

function isCompared(words: ReadonlyArray<string>, index: number): boolean {
  // `date NOT IN (…)`, of which `NOT` is no column
  const next = words[index + 1] === 'not' ? words[index + 2] : words[index + 1];

  return words[index] !== 'not' && COMPARISON.test(next ?? '');
}

/** whether the word at `index` is a name without its table: neither a table, a function, an alias nor a type */
function isBareName(
  words: ReadonlyArray<string>,
  index: number,
  tables: ReadonlySet<string>
): boolean {
  const word = words[index] ?? '';

  return (
    !['.', 'as', '::'].includes(words[index - 1] ?? '') &&
    !['.', '('].includes(words[index + 1] ?? '') &&
    !tables.has(word) &&
    !NOT_A_NAME.test(word)
  );
}
