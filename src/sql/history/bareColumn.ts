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

/** whether a clause names a column without its table */
export function namesBareColumn(
  words: ReadonlyArray<string>,
  tables: ReadonlySet<string>
): boolean {
  return words.some(
    (word, index) =>
      !isReservedKeyword(word) && isBareName(words, index, tables)
  );
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
