import { unquote } from '../tableName';
import { Clause, type HistoryBlock } from './recordedStatement';

const JOIN_KEYWORDS: ReadonlySet<string> = new Set(['join', 'straight_join']);

/** what a shape holds besides names: punctuation, operators, the `?` of a value */
const NOT_A_NAME = /^[^\p{L}_`"[]/u;

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
    const words = shape.split(' ').map((word) => unquote(word).toLowerCase());
    const tables = new Set(
      Object.values(aliases).map((table) => table.toLowerCase())
    );

    if (clause === Clause.From) {
      for (const table of new Set(words.filter((word) => tables.has(word)))) {
        add(this.tables, table, runCount);
      }

      return;
    }

    const columns = columnsOf(words, tables);

    for (const column of columns) {
      add(this.columns, column, runCount);
    }

    if (clause === Clause.Join) {
      const start = words.findIndex((word) => JOIN_KEYWORDS.has(word)) + 1;
      // `JOIN blog . auteur`: the table is the last part of the name
      const joined = words[start + 1] === '.' ? words[start + 2] : words[start];

      if (joined === undefined || !tables.has(joined)) {
        return;
      }

      add(this.tables, joined, runCount);

      const others = new Set(
        words.filter(
          (word, index) =>
            word !== joined && tables.has(word) && words[index + 1] === '.'
        )
      );

      for (const other of others) {
        add(this.joins, key(joined, other), runCount);
        add(this.joins, key(other, joined), runCount);
      }
    }
  }
}

/** the columns a clause reads, as `table.column` keys: those it qualifies, and its bare names when the statement reads one table */
function columnsOf(
  words: ReadonlyArray<string>,
  tables: ReadonlySet<string>
): Set<string> {
  const [onlyTable] = tables.size === 1 ? tables : [];
  const columns = new Set<string>();

  for (const [index, word] of words.entries()) {
    const before = words[index - 1];
    const after = words[index + 1];

    if (before === '.' && tables.has(words[index - 2] ?? '')) {
      columns.add(key(words[index - 2] ?? '', word));
    } else if (
      onlyTable !== undefined &&
      before !== '.' &&
      after !== '.' &&
      after !== '(' &&
      !tables.has(word) &&
      !NOT_A_NAME.test(word)
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
