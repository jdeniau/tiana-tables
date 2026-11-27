import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type { Clause } from '../../sql/history/recordedStatement';

/** A statement, counted by its shape: the same query run with 200 different ids counts 200. */
export const statement = sqliteTable(
  'statement',
  {
    id: integer().primaryKey(),
    /** `group:<name>`, or `connection:<slug>` for a connection without a group */
    history: text().notNull(),
    databaseName: text('database_name').notNull(),
    shape: text().notNull(),
    runCount: integer('run_count').notNull(),
    /** epoch milliseconds */
    lastRunAt: integer('last_run_at').notNull(),
  },
  (table) => [
    uniqueIndex('statement_shape').on(
      table.history,
      table.databaseName,
      table.shape
    ),
  ]
);

/** a text a statement ran with, which the suggestions take their values from */
export const run = sqliteTable(
  'run',
  {
    id: integer().primaryKey(),
    statementId: integer('statement_id')
      .notNull()
      .references(() => statement.id, { onDelete: 'cascade' }),
    sql: text().notNull(),
    ranAt: integer('ran_at').notNull(),
  },
  (table) => [uniqueIndex('run_text').on(table.statementId, table.sql)]
);

/** A clause of a SELECT, counted by its shape and kept as it last ran. */
export const block = sqliteTable(
  'block',
  {
    id: integer().primaryKey(),
    history: text().notNull(),
    databaseName: text('database_name').notNull(),
    clause: text().$type<Clause>().notNull(),
    shape: text().notNull(),
    sql: text().notNull(),
    /** the tables the aliases of `sql` stand for */
    aliases: text({ mode: 'json' }).$type<Record<string, string>>().notNull(),
    /** those of `RecordedBlock`: `WHERE id = ?` read on two tables is two blocks, `FROM article` joined to either one */
    tables: text({ mode: 'json' }).$type<Array<string>>().notNull().default([]),
    runCount: integer('run_count').notNull(),
    lastRunAt: integer('last_run_at').notNull(),
  },
  (table) => [
    uniqueIndex('block_shape').on(
      table.history,
      table.databaseName,
      table.clause,
      table.shape,
      table.tables
    ),
  ]
);
