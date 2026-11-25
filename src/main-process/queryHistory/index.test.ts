import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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

const { record, applyRetention, openHistory, clear } = testables;

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

  test('counts a clause by its shape and keeps the text it last ran with', () => {
    const join = (sql: string, aliases: Record<string, string>) => ({
      ...statement(sql, sql),
      aliases,
      blocks: [
        {
          clause: Clause.Join,
          sql: sql.slice(sql.indexOf('JOIN')),
          shape: 'JOIN auteur ON auteur . id = article . auteur_id',
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

describe('clearing the history', () => {
  test('deletes its file, and the next statement starts a new one', () => {
    record('solo', 'blog', statement('SELECT 1', 'SELECT ?'), 1);
    clear();

    expect(existsSync(join(folder.path, 'history.sqlite'))).toBe(false);

    record('solo', 'blog', statement('SELECT 2', 'SELECT ?'), 2);

    expect(rows('SELECT run_count FROM statement')).toEqual([{ run_count: 1 }]);
  });
});
