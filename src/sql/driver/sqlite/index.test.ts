import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DriverConnection } from '..';
import { FieldKind } from '../../resultField';
import { sqliteDriver } from '.';

const OPTIONS = { connectTimeoutMs: 1000, onClosed: () => {} };

let directory: string;
let connection: DriverConnection | undefined;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'tiana-sqlite-'));
});

afterEach(async () => {
  await connection?.end();
  connection = undefined;
  rmSync(directory, { recursive: true });
});

/** A database file holding the schema, opened by the driver. */
async function connectTo(
  schema: string,
  fileName = 'shop.db'
): Promise<DriverConnection> {
  const file = join(directory, fileName);
  const setup = new DatabaseSync(file);

  setup.exec(schema);
  setup.close();

  connection = await sqliteDriver.connect({ file }, OPTIONS);

  return connection;
}

describe('opening', () => {
  it('refuses a missing file, and creates none', async () => {
    const file = join(directory, 'missing.db');

    await expect(sqliteDriver.connect({ file }, OPTIONS)).rejects.toMatchObject(
      { code: 'SQLITE_CANTOPEN' }
    );
    expect(existsSync(file)).toBe(false);
  });

  it('refuses a directory', async () => {
    const file = join(directory, 'folder.db');

    mkdirSync(file);

    await expect(sqliteDriver.connect({ file }, OPTIONS)).rejects.toMatchObject(
      { code: 'SQLITE_CANTOPEN' }
    );
  });

  it('refuses a file that is not a database', async () => {
    const file = join(directory, 'notes.db');

    writeFileSync(
      file,
      'Some notes, long enough to fill a header of 100 bytes, which a database file starts with.'
    );

    await expect(sqliteDriver.connect({ file }, OPTIONS)).rejects.toMatchObject(
      { code: 'SQLITE_NOTADB' }
    );
  });

  it('opens a file whose name a URL would read otherwise', async () => {
    const db = await connectTo(
      'CREATE TABLE t (a); INSERT INTO t VALUES (1)',
      'a #1?mode=ro%20.db'
    );

    await expect(
      db.query({ sql: 'DELETE FROM t', rowsAsArray: false })
    ).resolves.toEqual([{ affectedRows: 1, insertId: null }, []]);
  });
});

describe('reading', () => {
  const schema = `
    CREATE TABLE orders (id INTEGER PRIMARY KEY, label VARCHAR(20), placed_on DATE, scan BLOB, note);
    INSERT INTO orders VALUES (9007199254740993, 'big', '2025-04-30', X'CA00', 2.5), (4, 'small', NULL, NULL, -9007199254740993);
  `;

  it('answers rows by column, an integer past 2^53 as its text', async () => {
    const db = await connectTo(schema);

    await expect(
      db.query({
        sql: 'SELECT id, label, placed_on, scan, note FROM orders ORDER BY id',
        rowsAsArray: false,
      })
    ).resolves.toEqual([
      [
        {
          id: 4,
          label: 'small',
          placed_on: null,
          scan: null,
          note: '-9007199254740993',
        },
        {
          id: '9007199254740993',
          label: 'big',
          placed_on: '2025-04-30',
          scan: new Uint8Array([0xca, 0x00]),
          note: 2.5,
        },
      ],
      [
        { name: 'id', table: 'orders', kind: FieldKind.Number },
        { name: 'label', table: 'orders', kind: FieldKind.String },
        { name: 'placed_on', table: 'orders', kind: FieldKind.Date },
        { name: 'scan', table: 'orders', kind: FieldKind.Binary },
        { name: 'note', table: 'orders', kind: FieldKind.Unknown },
      ],
    ]);
  });

  it('answers rows as arrays, and names the table behind an alias', async () => {
    const db = await connectTo(schema);

    await expect(
      db.query({
        sql: 'SELECT o.id, o.id AS same, count(*) AS n FROM orders AS o WHERE o.id = 4',
        rowsAsArray: true,
      })
    ).resolves.toEqual([
      [[4, 4, 1]],
      [
        { name: 'id', table: 'orders', kind: FieldKind.Number },
        { name: 'same', table: 'orders', kind: FieldKind.Number },
        { name: 'n', table: null, kind: FieldKind.Unknown },
      ],
    ]);
  });

  it('finds a row by a key past 2^53, sent back as the text it was read as', async () => {
    const db = await connectTo(schema);

    await expect(
      db.query({
        sql: 'SELECT label FROM orders WHERE id = :id',
        values: { id: '9007199254740993' },
        rowsAsArray: false,
      })
    ).resolves.toEqual([[{ label: 'big' }], expect.any(Array)]);
  });
});

describe('writing', () => {
  const schema = `
    CREATE TABLE parent (id INTEGER PRIMARY KEY);
    CREATE TABLE child (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parent (id));
    INSERT INTO parent VALUES (1), (2);
    INSERT INTO child VALUES (10, 1);
  `;

  it('answers the rows it changed and the row it inserted', async () => {
    const db = await connectTo(schema);

    await expect(
      db.query({ sql: 'INSERT INTO parent VALUES (7)', rowsAsArray: false })
    ).resolves.toEqual([{ affectedRows: 1, insertId: 7 }, []]);
  });

  it('answers no insert id once a statement inserts nothing', async () => {
    const db = await connectTo(schema);

    await db.query({
      sql: 'INSERT INTO parent VALUES (7)',
      rowsAsArray: false,
    });

    await expect(
      db.query({ sql: 'UPDATE child SET parent_id = 2', rowsAsArray: false })
    ).resolves.toEqual([{ affectedRows: 1, insertId: null }, []]);
  });

  it('answers no row changed by a statement that writes none', async () => {
    const db = await connectTo(schema);

    await db.query({ sql: 'DELETE FROM child', rowsAsArray: false });

    await expect(
      db.query({ sql: 'CREATE TABLE audit (at TEXT)', rowsAsArray: false })
    ).resolves.toEqual([{ affectedRows: 0, insertId: null }, []]);
  });

  it('keeps a row another references', async () => {
    const db = await connectTo(schema);

    await expect(
      db.query({ sql: 'DELETE FROM parent WHERE id = 1', rowsAsArray: false })
    ).rejects.toMatchObject({
      message: 'FOREIGN KEY constraint failed',
      detail: { kind: 'sql', code: 'constraint failed', errno: 787 },
    });
  });
});

describe('statements', () => {
  it('runs one, whatever blanks, semicolons and comments follow it', async () => {
    const db = await connectTo('CREATE TABLE t (a)');

    for (const sql of [
      'INSERT INTO t VALUES (1);',
      'INSERT INTO t VALUES (2) ;; -- done',
      'INSERT INTO t VALUES (3); /* done */\n',
      'INSERT INTO t VALUES (4); /* left open',
    ]) {
      await db.query({ sql, rowsAsArray: false });
    }

    await expect(
      db.query({ sql: 'SELECT a FROM t', rowsAsArray: true })
    ).resolves.toEqual([[[1], [2], [3], [4]], expect.any(Array)]);
  });

  it('refuses a text holding a second one, and runs neither', async () => {
    const db = await connectTo('CREATE TABLE t (a)');

    await expect(
      db.query({
        sql: 'INSERT INTO t VALUES (1); -- then\nDROP TABLE t',
        rowsAsArray: false,
      })
    ).rejects.toMatchObject({
      detail: { kind: 'sql', code: 'MULTIPLE_STATEMENTS' },
    });

    await expect(
      db.query({ sql: 'SELECT count(*) AS n FROM t', rowsAsArray: false })
    ).resolves.toEqual([[{ n: 0 }], expect.any(Array)]);
  });

  it('names a refused one by the words and the number SQLite gives', async () => {
    const db = await connectTo('CREATE TABLE t (a)');

    await expect(
      db.query({ sql: 'SELECT * FROM missing', rowsAsArray: false })
    ).rejects.toMatchObject({
      message: 'no such table: missing',
      detail: { kind: 'sql', code: 'SQL logic error', errno: 1 },
    });
  });
});
