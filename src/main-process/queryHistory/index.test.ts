import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrateSync } from 'drizzle-orm/sqlite-core/async/session';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getConfiguration } from '../../configuration';
import type { Configuration } from '../../configuration/type';
import { QUERY_HISTORY_CHANNEL } from '../../preload/queryHistoryChannel';
import { Clause } from '../../sql/history/recordedStatement';
import { bindIpcMainQueryHistory, testables } from '.';

const folder = vi.hoisted(() => ({ path: '' }));

vi.mock('../../configuration', () => ({ getConfiguration: vi.fn() }));

vi.mock('../../configuration/filePaths', () => ({
  createConfigurationFolderIfNotExists: vi.fn(),
  getConfigurationFolder: () => folder.path,
}));

const { record, load, applyRetention, openHistory, clear, migrations } =
  testables;

const groups: Record<string, string | undefined> = {
  'client-a-prod': 'Client A',
  'client-a-staging': 'Client A',
  solo: undefined,
  other: undefined,
};

function statement(sql: string, shape: string) {
  return { sql, shape, aliases: {}, blocks: [] };
}

/** what the file holds, read as another process would */
function rows(sql: string): Array<Record<string, unknown>> {
  const db = new DatabaseSync(join(folder.path, 'history.sqlite'));

  try {
    return db.prepare(sql).all();
  } finally {
    db.close();
  }
}

beforeEach(() => {
  folder.path = mkdtempSync(join(tmpdir(), 'query-history-'));

  vi.mocked(getConfiguration).mockReturnValue({
    connections: Object.fromEntries(
      Object.entries(groups).map(([slug, group]) => [slug, { slug, group }])
    ),
  } as unknown as Configuration);
});

afterEach(() => {
  clear();
  rmSync(folder.path, { recursive: true, force: true });
});

describe('recording a statement', () => {
  test('counts it by its shape and keeps each text it was run with', () => {
    const shape = 'SELECT * FROM article WHERE id = ?';

    record(
      'solo',
      'blog',
      statement('SELECT * FROM article WHERE id = 12', shape),
      1
    );
    record(
      'solo',
      'blog',
      statement('SELECT * FROM article WHERE id = 87', shape),
      2
    );

    expect(rows('SELECT shape, run_count, last_run_at FROM statement')).toEqual(
      [{ shape, run_count: 2, last_run_at: 2 }]
    );
    expect(rows('SELECT sql, ran_at FROM run ORDER BY ran_at')).toEqual([
      { sql: 'SELECT * FROM article WHERE id = 12', ran_at: 1 },
      { sql: 'SELECT * FROM article WHERE id = 87', ran_at: 2 },
    ]);
  });

  test('keeps the ten most recent texts of a shape', () => {
    for (let id = 1; id <= 11; id++) {
      record('solo', 'blog', statement(`SELECT ${id}`, 'SELECT ?'), id);
    }

    const texts = rows('SELECT sql FROM run ORDER BY ran_at').map(
      ({ sql }) => sql
    );

    expect(texts).toHaveLength(10);
    expect(texts[0]).toBe('SELECT 2');
    expect(texts.at(-1)).toBe('SELECT 11');
  });

  test('shares the history of a group, and keeps a connection without one apart', () => {
    for (const slug of Object.keys(groups)) {
      record(slug, 'blog', statement('SELECT 1', 'SELECT ?'), 1);
    }

    expect(
      rows('SELECT history, run_count FROM statement ORDER BY history')
    ).toEqual([
      { history: 'connection:other', run_count: 1 },
      { history: 'connection:solo', run_count: 1 },
      { history: 'group:Client A', run_count: 2 },
    ]);
  });

  test('keeps apart what ran on two databases', () => {
    record('solo', 'blog', statement('SELECT 1', 'SELECT ?'), 1);
    record('solo', 'shop', statement('SELECT 1', 'SELECT ?'), 2);

    expect(rows('SELECT database_name FROM statement ORDER BY 1')).toEqual([
      { database_name: 'blog' },
      { database_name: 'shop' },
    ]);
  });

  test('answers how many runs the history holds for the database', () => {
    const shape = 'SELECT * FROM article WHERE id = ?';
    const byId = (id: number) =>
      statement(`SELECT * FROM article WHERE id = ${id}`, shape);

    expect(record('solo', 'blog', byId(1))).toBe(1);
    // a shape run again is a run more, though no statement more
    expect(record('solo', 'blog', byId(2))).toBe(2);
    expect(record('solo', 'blog', statement('SELECT 1', 'SELECT ?'))).toBe(3);

    expect(record('solo', 'shop', byId(1))).toBe(1);
    expect(record('other', 'blog', byId(1))).toBe(1);
    expect(record('client-a-prod', 'blog', byId(1))).toBe(1);
    expect(record('client-a-staging', 'blog', byId(1))).toBe(2);
  });

  test('counts the runs an earlier launch recorded', () => {
    openHistory()
      .$client.prepare(
        `INSERT INTO statement (history, database_name, shape, run_count, last_run_at)
         VALUES ('connection:solo', 'blog', 'SELECT ?', 150, 1)`
      )
      .run();

    expect(
      record('solo', 'blog', statement('SELECT 1, 2', 'SELECT ?, ?'))
    ).toBe(151);
  });

  test('counts a clause by its shape and keeps the text it last ran with', () => {
    const join = (sql: string, aliases: Record<string, string>) => ({
      ...statement(sql, sql),
      aliases,
      blocks: [
        {
          clause: Clause.Join,
          sql: sql.slice(sql.indexOf('JOIN')),
          shape: 'JOIN auteur ON auteur . id = article . auteur_id',
          tables: [],
        },
      ],
    });

    record(
      'solo',
      'blog',
      join('SELECT * FROM article a JOIN auteur au ON au.id = a.auteur_id', {
        a: 'article',
        au: 'auteur',
      }),
      1
    );
    record(
      'solo',
      'blog',
      join(
        'SELECT * FROM article art JOIN auteur ON auteur.id = art.auteur_id',
        {
          art: 'article',
          auteur: 'auteur',
        }
      ),
      2
    );

    expect(rows('SELECT clause, sql, aliases, run_count FROM block')).toEqual([
      {
        clause: 'join',
        sql: 'JOIN auteur ON auteur.id = art.auteur_id',
        aliases: '{"art":"article","auteur":"auteur"}',
        run_count: 2,
      },
    ]);
  });

  test('counts a clause apart on each set of tables, whose shape names none', () => {
    const byId = (table: string) => ({
      ...statement(`SELECT * FROM ${table} WHERE id = 3`, ''),
      aliases: { [table]: table },
      blocks: [
        {
          clause: Clause.Where,
          sql: 'WHERE id = 3',
          shape: 'WHERE id = ?',
          tables: [table],
        },
      ],
    });

    record('solo', 'blog', byId('article'), 1);
    record('solo', 'blog', byId('article'), 2);
    record('solo', 'blog', byId('commentaire'), 3);

    expect(rows('SELECT tables, aliases, run_count FROM block')).toEqual([
      { tables: '["article"]', aliases: '{"article":"article"}', run_count: 2 },
      {
        tables: '["commentaire"]',
        aliases: '{"commentaire":"commentaire"}',
        run_count: 1,
      },
    ]);
  });

  test('counts on the clauses of a history written before their tables were kept', () => {
    const path = join(folder.path, 'history.sqlite');
    const db = drizzle({ client: new DatabaseSync(path) });

    migrateSync(migrations().slice(0, 1), db._.session);
    db.$client.exec(
      `INSERT INTO block (history, database_name, clause, shape, sql, aliases, run_count, last_run_at)
       VALUES ('connection:solo', 'blog', 'join', 'JOIN auteur ON auteur . id = article . auteur_id',
         'JOIN auteur au ON au.id = a.auteur_id', '{"a":"article","au":"auteur"}', 4, 1)`
    );
    db.$client.close();

    record(
      'solo',
      'blog',
      {
        ...statement(
          'SELECT * FROM article JOIN auteur ON auteur.id = article.auteur_id',
          ''
        ),
        aliases: { article: 'article', auteur: 'auteur' },
        blocks: [
          {
            clause: Clause.Join,
            sql: 'JOIN auteur ON auteur.id = article.auteur_id',
            shape: 'JOIN auteur ON auteur . id = article . auteur_id',
            tables: [],
          },
        ],
      },
      2
    );

    expect(rows('SELECT tables, run_count FROM block')).toEqual([
      { tables: '[]', run_count: 5 },
    ]);
  });

  test('refuses a payload that is not a statement', async () => {
    const handlers = new Map<string, (...args: Array<unknown>) => unknown>();

    bindIpcMainQueryHistory({
      handle: (
        channel: string,
        handler: (...args: Array<unknown>) => unknown
      ) => {
        handlers.set(channel, (...args) => handler({}, ...args));
      },
    } as unknown as Electron.IpcMain);

    const recordFromRenderer = handlers.get(QUERY_HISTORY_CHANNEL.RECORD);

    expect(() =>
      recordFromRenderer?.('solo', 'blog', {
        ...statement('SELECT 1', 'SELECT ?'),
        blocks: [
          { clause: 'returning', sql: 'RETURNING id', shape: 'RETURNING id' },
        ],
      })
    ).toThrow();
    expect(existsSync(join(folder.path, 'history.sqlite'))).toBe(false);
  });
});

describe('the retention', () => {
  const limits = { maxAgeMs: 10, kept: 2, max: 3 };

  test('forgets what is too old, past the most recent entries of a history', () => {
    for (let at = 1; at <= 4; at++) {
      record('solo', 'blog', statement(`SELECT ${at}`, `SELECT ${at}`), at);
    }

    applyRetention(openHistory(), 100, limits);

    expect(rows('SELECT shape FROM statement ORDER BY 1')).toEqual([
      { shape: 'SELECT 3' },
      { shape: 'SELECT 4' },
    ]);
    expect(rows('SELECT sql FROM run ORDER BY 1')).toEqual([
      { sql: 'SELECT 3' },
      { sql: 'SELECT 4' },
    ]);
  });

  test('keeps no more than its maximum, however recent', () => {
    for (let at = 95; at <= 99; at++) {
      record('solo', 'blog', statement(`SELECT ${at}`, `SELECT ${at}`), at);
    }

    applyRetention(openHistory(), 100, limits);

    expect(rows('SELECT shape FROM statement ORDER BY 1')).toEqual([
      { shape: 'SELECT 97' },
      { shape: 'SELECT 98' },
      { shape: 'SELECT 99' },
    ]);
  });

  test('counts each history on its own', () => {
    for (let at = 1; at <= 3; at++) {
      record('solo', 'blog', statement(`SELECT ${at}`, `SELECT ${at}`), at);
      record('other', 'blog', statement(`SELECT ${at}`, `SELECT ${at}`), at);
    }

    applyRetention(openHistory(), 100, limits);

    expect(rows('SELECT history, shape FROM statement ORDER BY 1, 2')).toEqual([
      { history: 'connection:other', shape: 'SELECT 2' },
      { history: 'connection:other', shape: 'SELECT 3' },
      { history: 'connection:solo', shape: 'SELECT 2' },
      { history: 'connection:solo', shape: 'SELECT 3' },
    ]);
  });
});

describe('loading a history', () => {
  const where = (sql: string, shape: string) => ({
    ...statement(`SELECT * FROM article a ${sql}`, shape),
    aliases: { a: 'article' },
    blocks: [{ clause: Clause.Where, sql, shape }],
  });

  test('holds the clauses run on that database by every connection of the group', () => {
    record(
      'client-a-prod',
      'blog',
      where('WHERE a.id = 3', 'WHERE article . id = ?'),
      1
    );
    record(
      'client-a-staging',
      'blog',
      where('WHERE a.id = 7', 'WHERE article . id = ?'),
      2
    );
    record(
      'client-a-staging',
      'shop',
      where('WHERE a.id = 1', 'WHERE article . id = ?'),
      3
    );
    record('solo', 'blog', where('WHERE a.statut = 1', 'WHERE x'), 4);

    expect(load('client-a-prod', 'blog')).toEqual({
      blocks: [
        {
          clause: Clause.Where,
          shape: 'WHERE article . id = ?',
          sql: 'WHERE a.id = 7',
          aliases: { a: 'article' },
          runCount: 2,
        },
      ],
    });
  });
});

describe('clearing the history', () => {
  test('deletes its file, and the next statement starts a new one', () => {
    record('solo', 'blog', statement('SELECT 1', 'SELECT ?'), 1);
    clear();

    expect(existsSync(join(folder.path, 'history.sqlite'))).toBe(false);

    // its runs are counted from none again
    expect(record('solo', 'blog', statement('SELECT 2', 'SELECT ?'), 2)).toBe(
      1
    );
    expect(rows('SELECT run_count FROM statement')).toEqual([{ run_count: 1 }]);
  });

  test('deletes the journal a crash left beside it', () => {
    const journal = join(folder.path, 'history.sqlite-journal');

    writeFileSync(journal, 'SELECT 1');
    clear();

    expect(existsSync(journal)).toBe(false);
  });
});
