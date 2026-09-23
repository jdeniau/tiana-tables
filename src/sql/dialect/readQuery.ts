import { z } from 'zod';
import type { ResultRow, SqlBoundValues } from '../types';

/**
 * A statement with the values its placeholders name:
 * identifiers are bound, never interpolated.
 */
export interface BuiltQuery {
  sql: string;
  values: SqlBoundValues;
}

/**
 * Parses a server's rows against the shape its statement selects,
 * naming the question, row and column that do not fit.
 */
function rowsOf<T>(
  question: string,
  row: z.ZodType<T>,
  rows: ResultRow[]
): T[] {
  const parsed = z.array(row).safeParse(rows);

  if (parsed.success) {
    return parsed.data;
  }

  const [issue] = parsed.error.issues;
  // the path of an array of objects reads `[index, …keys]`
  const [index, ...keys] = issue.path.map(String);
  const where =
    keys.length > 0 ? `row ${index}, ${keys.join('.')}` : `row ${index}`;

  throw new Error(
    `${question} answered a row this dialect cannot read — ${where}: ${issue.message}`
  );
}

/** A statement that reads, and how to read what the server answers to it. */
export interface ReadQuery<Answer> extends BuiltQuery {
  answer(rows: ResultRow[]): Answer;
}

/**
 * The one way a dialect writes a read:
 * the rows are parsed against `row` before `read` sees them.
 */
export function readQuery<Row, Answer>(
  question: string,
  query: BuiltQuery & {
    row: z.ZodType<Row>;
    read(rows: Row[]): Answer;
  }
): ReadQuery<Answer> {
  return {
    sql: query.sql,
    values: query.values,
    answer: (rows) => query.read(rowsOf(question, query.row, rows)),
  };
}
