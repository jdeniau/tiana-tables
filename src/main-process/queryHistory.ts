import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { getConfiguration } from '../configuration';
import {
  createConfigurationFolderIfNotExists,
  getConfigurationFolder,
} from '../configuration/filePaths';
import { QUERY_HISTORY_CHANNEL } from '../preload/queryHistoryChannel';
import {
  Clause,
  type RecordedStatement,
} from '../sql/history/recordedStatement';

const DAY_MS = 24 * 60 * 60 * 1000;

type Retention = {
  /** a statement or a clause not run for this long is forgotten… */
  maxAgeMs: number;
  /** …unless it is among the most recent of its history, so that a connection opened twice a year keeps its own */
  kept: number;
  /** whatever their age, a history holds no more */
  max: number;
};

const RETENTION: Retention = { maxAgeMs: 365 * DAY_MS, kept: 500, max: 5000 };

/** the texts kept for one shape, which the suggestions take their values from */
const RUNS_PER_STATEMENT = 10;

/** Each entry brings the schema to the version after its index: append one, never edit one. */
const MIGRATIONS: ReadonlyArray<string> = [
  `
  CREATE TABLE statement (
    id INTEGER PRIMARY KEY,
    history TEXT NOT NULL,
    database_name TEXT NOT NULL,
    shape TEXT NOT NULL,
    run_count INTEGER NOT NULL,
    last_run_at INTEGER NOT NULL,
    UNIQUE (history, database_name, shape)
  );

  CREATE TABLE run (
    id INTEGER PRIMARY KEY,
    statement_id INTEGER NOT NULL REFERENCES statement (id) ON DELETE CASCADE,
    sql TEXT NOT NULL,
    ran_at INTEGER NOT NULL,
    UNIQUE (statement_id, sql)
  );

  CREATE TABLE block (
    id INTEGER PRIMARY KEY,
    history TEXT NOT NULL,
    database_name TEXT NOT NULL,
    clause TEXT NOT NULL,
    shape TEXT NOT NULL,
    sql TEXT NOT NULL,
    aliases TEXT NOT NULL,
    run_count INTEGER NOT NULL,
    last_run_at INTEGER NOT NULL,
    UNIQUE (history, database_name, clause, shape)
  );
  `,
];

const recordedStatementSchema: z.ZodType<RecordedStatement> = z.object({
  sql: z.string(),
  shape: z.string(),
  aliases: z.record(z.string(), z.string()),
  blocks: z.array(
    z.object({ clause: z.enum(Clause), sql: z.string(), shape: z.string() })
  ),
});

let database: DatabaseSync | undefined;

/** beside `config.json` */
function historyPath(): string {
  return join(getConfigurationFolder(), 'history.sqlite');
}

function transaction(db: DatabaseSync, run: () => void): void {
  db.exec('BEGIN');

  try {
    run();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function migrate(db: DatabaseSync): void {
  const { user_version: version } = z
    .object({ user_version: z.number() })
    .parse(db.prepare('PRAGMA user_version').get());

  MIGRATIONS.slice(version).forEach((migration, index) => {
    transaction(db, () => {
      db.exec(migration);
      db.exec(`PRAGMA user_version = ${version + index + 1}`);
    });
  });
}

/** forget, in each table, what is too old and past the most recent entries of its history */
function applyRetention(
  db: DatabaseSync,
  now: number,
  { maxAgeMs, kept, max }: Retention = RETENTION
): void {
  for (const table of ['statement', 'block']) {
    db.prepare(
      `DELETE FROM ${table} WHERE id IN (
        SELECT id FROM (
          SELECT id, last_run_at, ROW_NUMBER() OVER (
            PARTITION BY history ORDER BY last_run_at DESC, id DESC
          ) AS position
          FROM ${table}
        )
        WHERE position > :max OR (position > :kept AND last_run_at < :expiry)
      )`
    ).run({ max, kept, expiry: now - maxAgeMs });
  }
}

/** opened on first use, which is also when the retention applies: once per launch */
function openHistory(): DatabaseSync {
  if (!database) {
    createConfigurationFolderIfNotExists();

    const db = new DatabaseSync(historyPath());

    db.exec('PRAGMA foreign_keys = ON');
    migrate(db);
    applyRetention(db, Date.now());
    database = db;
  }

  return database;
}

/** the history a connection shares with the other connections of its group, or its own when it has none */
function historyOf(connectionSlug: string): string {
  const group = getConfiguration().connections[connectionSlug]?.group;

  return group ? `group:${group}` : `connection:${connectionSlug}`;
}

function record(
  connectionSlug: string,
  databaseName: string,
  statement: RecordedStatement,
  now = Date.now()
): void {
  const db = openHistory();
  const history = historyOf(connectionSlug);

  transaction(db, () => {
    const { id } = z.object({ id: z.number() }).parse(
      db
        .prepare(
          `INSERT INTO statement (history, database_name, shape, run_count, last_run_at)
          VALUES (:history, :databaseName, :shape, 1, :now)
          ON CONFLICT (history, database_name, shape) DO UPDATE
          SET run_count = run_count + 1, last_run_at = excluded.last_run_at
          RETURNING id`
        )
        .get({ history, databaseName, shape: statement.shape, now })
    );

    db.prepare(
      `INSERT INTO run (statement_id, sql, ran_at) VALUES (:id, :sql, :now)
      ON CONFLICT (statement_id, sql) DO UPDATE SET ran_at = excluded.ran_at`
    ).run({ id, sql: statement.sql, now });

    db.prepare(
      `DELETE FROM run WHERE statement_id = :id AND id NOT IN (
        SELECT id FROM run WHERE statement_id = :id
        ORDER BY ran_at DESC, id DESC LIMIT :kept
      )`
    ).run({ id, kept: RUNS_PER_STATEMENT });

    const recordBlock = db.prepare(
      `INSERT INTO block (history, database_name, clause, shape, sql, aliases, run_count, last_run_at)
      VALUES (:history, :databaseName, :clause, :shape, :sql, :aliases, 1, :now)
      ON CONFLICT (history, database_name, clause, shape) DO UPDATE
      SET run_count = run_count + 1, last_run_at = excluded.last_run_at,
        sql = excluded.sql, aliases = excluded.aliases`
    );
    const aliases = JSON.stringify(statement.aliases);

    for (const { clause, shape, sql } of statement.blocks) {
      recordBlock.run({
        history,
        databaseName,
        clause,
        shape,
        sql,
        aliases,
        now,
      });
    }
  });
}

/** the file goes, rather than its rows: a deleted row can linger in the file's free pages */
function clear(): void {
  database?.close();
  database = undefined;

  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`${historyPath()}${suffix}`, { force: true });
  }
}

export function bindIpcMainQueryHistory(ipcMain: Electron.IpcMain): void {
  ipcMain.handle(QUERY_HISTORY_CHANNEL.RECORD, (event, ...args) =>
    record(
      ...z.tuple([z.string(), z.string(), recordedStatementSchema]).parse(args)
    )
  );

  ipcMain.handle(QUERY_HISTORY_CHANNEL.CLEAR, () => clear());
}

export const testables = { record, applyRetention, openHistory, clear };
