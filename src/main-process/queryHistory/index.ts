import { createHash } from 'node:crypto';
import { rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  lt,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import type { MigrationMeta } from 'drizzle-orm/migrator';
import { formatToMillis } from 'drizzle-orm/migrator.utils';
import { type NodeSQLiteDatabase, drizzle } from 'drizzle-orm/node-sqlite';
import { migrateSync } from 'drizzle-orm/sqlite-core/async/session';
import { z } from 'zod';
import { getConfiguration } from '../../configuration';
import {
  createConfigurationFolderIfNotExists,
  getConfigurationFolder,
} from '../../configuration/filePaths';
import { QUERY_HISTORY_CHANNEL } from '../../preload/queryHistoryChannel';
import {
  Clause,
  type QueryHistoryContent,
  type RecordedStatement,
} from '../../sql/history/recordedStatement';
import { block, run, statement } from './schema';

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

/** written by `yarn history:generate`, bundled: Drizzle's `migrate()` reads a folder the packaged app does not ship */
const MIGRATION_FILES = import.meta.glob<string>(
  './migrations/*/migration.sql',
  { query: '?raw', import: 'default', eager: true }
);

/** the client stays reachable, for `clear()` to close it */
type HistoryDatabase = NodeSQLiteDatabase & { $client: DatabaseSync };

const recordedStatementSchema: z.ZodType<RecordedStatement> = z.object({
  sql: z.string(),
  shape: z.string(),
  aliases: z.record(z.string(), z.string()),
  blocks: z.array(
    z.object({
      clause: z.enum(Clause),
      sql: z.string(),
      shape: z.string(),
      tables: z.array(z.string()),
    })
  ),
});

let database: HistoryDatabase | undefined;

/** beside `config.json` */
function historyPath(): string {
  return join(getConfigurationFolder(), 'history.sqlite');
}

/** the bundled migrations, as Drizzle's `migrate()` reads them from their folder */
function migrations(): Array<MigrationMeta> {
  return Object.entries(MIGRATION_FILES)
    .map(([path, query]) => ({ name: basename(dirname(path)), query }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, query }) => ({
      name,
      sql: query.split('--> statement-breakpoint'),
      bps: true,
      folderMillis: formatToMillis(name.slice(0, 14)),
      hash: createHash('sha256').update(query).digest('hex'),
    }));
}

/** forget, in each table, what is too old and past the most recent entries of its history */
function applyRetention(
  db: NodeSQLiteDatabase,
  now: number,
  { maxAgeMs, kept, max }: Retention = RETENTION
): void {
  for (const table of [statement, block]) {
    const ranked = db
      .select({
        id: table.id,
        lastRunAt: table.lastRunAt,
        position: sql<number>`row_number() over (
          partition by ${table.history} order by ${table.lastRunAt} desc, ${table.id} desc
        )`.as('position'),
      })
      .from(table)
      .as('ranked');

    const forgotten = db
      .select({ id: ranked.id })
      .from(ranked)
      .where(
        or(
          gt(ranked.position, max),
          and(gt(ranked.position, kept), lt(ranked.lastRunAt, now - maxAgeMs))
        )
      );

    db.delete(table).where(inArray(table.id, forgotten)).run();
  }
}

/** opened on first use, which is also when the retention applies: once per launch */
function openHistory(): HistoryDatabase {
  if (!database) {
    createConfigurationFolderIfNotExists();

    const db = drizzle({ client: new DatabaseSync(historyPath()) });

    migrateSync(migrations(), db._.session);
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
  recorded: RecordedStatement,
  now = Date.now()
): void {
  const db = openHistory();
  const history = historyOf(connectionSlug);

  db.transaction((tx) => {
    const { id } = tx
      .insert(statement)
      .values({
        history,
        databaseName,
        shape: recorded.shape,
        runCount: 1,
        lastRunAt: now,
      })
      .onConflictDoUpdate({
        target: [statement.history, statement.databaseName, statement.shape],
        set: { runCount: sql`${statement.runCount} + 1`, lastRunAt: now },
      })
      .returning({ id: statement.id })
      .get();

    tx.insert(run)
      .values({ statementId: id, sql: recorded.sql, ranAt: now })
      .onConflictDoUpdate({
        target: [run.statementId, run.sql],
        set: { ranAt: now },
      })
      .run();

    const latestRuns = tx
      .select({ id: run.id })
      .from(run)
      .where(eq(run.statementId, id))
      .orderBy(desc(run.ranAt), desc(run.id))
      .limit(RUNS_PER_STATEMENT);

    tx.delete(run)
      .where(and(eq(run.statementId, id), notInArray(run.id, latestRuns)))
      .run();

    for (const { clause, shape, sql: text, tables } of recorded.blocks) {
      tx.insert(block)
        .values({
          history,
          databaseName,
          clause,
          shape,
          tables,
          sql: text,
          aliases: recorded.aliases,
          runCount: 1,
          lastRunAt: now,
        })
        .onConflictDoUpdate({
          target: [
            block.history,
            block.databaseName,
            block.clause,
            block.shape,
            block.tables,
          ],
          set: {
            runCount: sql`${block.runCount} + 1`,
            lastRunAt: now,
            sql: text,
            aliases: recorded.aliases,
          },
        })
        .run();
    }
  });
}

function load(
  connectionSlug: string,
  databaseName: string
): QueryHistoryContent {
  const blocks = openHistory()
    .select({
      clause: block.clause,
      shape: block.shape,
      sql: block.sql,
      aliases: block.aliases,
      runCount: block.runCount,
    })
    .from(block)
    .where(
      and(
        eq(block.history, historyOf(connectionSlug)),
        eq(block.databaseName, databaseName)
      )
    )
    .all();

  return { blocks };
}

/** the file goes, rather than its rows: a deleted row can linger in the file's free pages */
function clear(): void {
  database?.$client.close();
  database = undefined;

  // a crash in the middle of a write leaves the journal, which holds rows as they were
  for (const suffix of ['', '-journal']) {
    rmSync(`${historyPath()}${suffix}`, { force: true });
  }
}

export function bindIpcMainQueryHistory(ipcMain: Electron.IpcMain): void {
  ipcMain.handle(QUERY_HISTORY_CHANNEL.RECORD, (event, ...args) =>
    record(
      ...z.tuple([z.string(), z.string(), recordedStatementSchema]).parse(args)
    )
  );

  ipcMain.handle(QUERY_HISTORY_CHANNEL.LOAD, (event, ...args) =>
    load(...z.tuple([z.string(), z.string()]).parse(args))
  );

  ipcMain.handle(QUERY_HISTORY_CHANNEL.CLEAR, () => clear());
}

export const testables = {
  record,
  load,
  applyRetention,
  openHistory,
  clear,
  migrations,
};
