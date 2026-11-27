import { isBareColumn, tablesOf, wordsOf } from './bareColumn';
import { Clause, type HistoryBlock } from './recordedStatement';

const JOIN_KEYWORDS: ReadonlySet<string> = new Set(['join', 'straight_join']);

/**
 * How many runs of the history read each table and column, and joined each pair of tables,
 * which the completion ranks by. Names are compared in lower case: a shape upper-cases a table or a column named like a keyword.
 */
export class HistoryUsage {
  private readonly tables = new Map<string, number>();

  private readonly columns = new Map<string, number>();

  private readonly joins = new Map<string, number>();

  constructor(blocks: ReadonlyArray<HistoryBlock>) {
    for (const block of blocks) {
      this.count(block);
    }
  }

  ofTable(table: string): number {
    return this.tables.get(table.toLowerCase()) ?? 0;
  }

  ofColumn(table: string, column: string): number {
    return this.columns.get(key(table, column)) ?? 0;
  }

  /** the runs that joined the two tables, whichever came first */
  ofJoin(table: string, other: string): number {
    return this.joins.get(key(table, other)) ?? 0;
  }

  private count({ clause, shape, aliases, runCount }: HistoryBlock): void {
    const words = wordsOf(shape);
    const tables = tablesOf(aliases);

    if (clause === Clause.From) {
      for (const table of new Set(words.filter((word) => tables.has(word)))) {
        add(this.tables, table, runCount);
      }

      return;
    }

    const columns = columnsOf(words, tables, shape.split(' '));

    for (const column of columns) {
      add(this.columns, column, runCount);
    }

    if (clause === Clause.Join) {
      const joined = joinedTable(words, tables);

      if (joined === undefined) {
        return;
      }

      add(this.tables, joined, runCount);

      // of two tables, the join joins the other, which `USING ( auteur_id )` or `NATURAL JOIN` never names
      const others = (
        tables.size === 2 ? tables : qualifiers(words, tables)
      ).difference(new Set([joined]));

      for (const other of others) {
        add(this.joins, key(joined, other), runCount);
        add(this.joins, key(other, joined), runCount);
      }
    }
  }
}

/** the words of a shape, in lower case like every name here */
export function wordsOf(shape: string): Array<string> {
  return shape.split(' ').map((word) => unquote(word).toLowerCase());
}

/** the tables aliases stand for, in lower case like every name here */
export function tablesOf(aliases: Record<string, string>): Set<string> {
  return new Set(Object.values(aliases).map((table) => table.toLowerCase()));
}

/** the table a `JOIN` block joins, `undefined` when it is not one the statement read */
export function joinedTable(
  words: ReadonlyArray<string>,
  tables: ReadonlySet<string>
): string | undefined {
  const start = words.findIndex((word) => JOIN_KEYWORDS.has(word)) + 1;
  // `JOIN blog . auteur`: the table is the last part of the name
  const joined = words[start + 1] === '.' ? words[start + 2] : words[start];

  return joined !== undefined && tables.has(joined) ? joined : undefined;
}

/** the tables of the statement a shape qualifies a column with */
export function qualifiers(
  words: ReadonlyArray<string>,
  tables: ReadonlySet<string>
): Set<string> {
  return new Set(
    words.filter((word, index) => tables.has(word) && words[index + 1] === '.')
  );
}

/** the columns a clause reads, as `table.column` keys: those it qualifies, and its bare columns when the statement reads one table */
function columnsOf(
  words: ReadonlyArray<string>,
  tables: ReadonlySet<string>,
  written: ReadonlyArray<string>
): Set<string> {
  const [onlyTable] = tables.size === 1 ? tables : [];
  const columns = new Set<string>();

  for (const [index, word] of words.entries()) {
    if (words[index - 1] === '.' && tables.has(words[index - 2] ?? '')) {
      columns.add(key(words[index - 2] ?? '', word));
    } else if (
      onlyTable !== undefined &&
      isBareColumn(words, index, tables, written)
    ) {
      columns.add(key(onlyTable, word));
    }
  }

  return columns;
}

function key(table: string, name: string): string {
  return `${table}.${name}`.toLowerCase();
}

function add(
  counts: Map<string, number>,
  name: string,
  runCount: number
): void {
  counts.set(name, (counts.get(name) ?? 0) + runCount);
}
