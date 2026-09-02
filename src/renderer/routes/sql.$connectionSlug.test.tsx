/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SqlError } from '../../sql/errorSerializer';
import { RunMode } from '../../sql/runMode';
import { action } from './sql.$connectionSlug';

function runAction(
  databaseName: string,
  raw: string,
  { mode = RunMode.Current, caretOffset = 0 } = {}
) {
  const formData = new FormData();
  formData.set('raw', raw);
  formData.set('mode', mode);
  formData.set('caretOffset', String(caretOffset));

  return action({
    params: { connectionSlug: 'connectionSlug', databaseName },
    request: new Request('http://localhost', {
      method: 'POST',
      body: formData,
    }),
    context: {},
  });
}

/** the queries sent, the leading `USE` left out */
function sentQueries(): unknown[] {
  return vi
    .mocked(window.sql.executeQuery)
    .mock.calls.slice(1)
    .map(([query]) => query);
}

function sqlError(message: string): SqlError {
  return Object.assign(new Error(message), {
    code: 'ER_NO_SUCH_TABLE',
    errno: 1146,
    sql: '',
    sqlMessage: message,
    sqlState: '42S02',
  });
}

describe('action', () => {
  beforeEach(() => {
    window.sql = {
      // @ts-expect-error return is OK here, the type is too complex for now
      executeQuery: vi.fn(() => Promise.resolve([[], []])),
    };
  });

  afterEach(() => {
    // @ts-expect-error reset data here, will be re-set in `beforeEach`
    window.sql = undefined;
  });

  test('escapes the database name of the USE it sends first', async () => {
    await runAction('some-database', 'SELECT 1');

    // `USE some-database` is a syntax error: the panel used to be unusable on
    // any database whose name holds a dash
    expect(window.sql.executeQuery).toHaveBeenNthCalledWith(
      1,
      'USE `some-database`;'
    );
  });

  test('sends the query the user wrote as written', async () => {
    await runAction('shop', "SELECT * FROM orders WHERE label = 'a:b'");

    expect(window.sql.executeQuery).toHaveBeenNthCalledWith(
      2,
      "SELECT * FROM orders WHERE label = 'a:b'",
      true
    );
  });

  test('sends only the statement the caret sits in', async () => {
    const raw = 'SELECT 1;\nSELECT 2;\nSELECT 3;';

    await runAction('shop', raw, { caretOffset: raw.indexOf('2') });

    expect(sentQueries()).toEqual(['SELECT 2;']);
  });

  test('sends every statement, in order, when asked to run them all', async () => {
    await runAction('shop', 'SELECT 1;\nSELECT 2;\nSELECT 3', {
      mode: RunMode.All,
    });

    expect(sentQueries()).toEqual(['SELECT 1;', 'SELECT 2;', 'SELECT 3']);
  });

  test('stops at the first statement that fails', async () => {
    const error = sqlError('Table `nope` does not exist');

    vi.mocked(window.sql.executeQuery).mockImplementation((query) =>
      query.includes('2') ? Promise.reject(error) : Promise.resolve([[], []])
    );

    const { outcomes } = await runAction(
      'shop',
      'SELECT 1;\nSELECT 2;\nSELECT 3;',
      { mode: RunMode.All }
    );

    expect(sentQueries()).toEqual(['SELECT 1;', 'SELECT 2;']);
    expect(outcomes).toHaveLength(2);
    expect(outcomes[1]).toEqual({ sql: 'SELECT 2;', error });
  });

  // The result panel gates the chart tab on this: a partial result set would
  // draw a chart that looks right and is not.
  test('reports whether the query limited its result set', async () => {
    await expect(runAction('shop', 'SELECT * FROM orders')).resolves.toEqual({
      outcomes: [expect.objectContaining({ hasLimit: false })],
    });

    await expect(
      runAction('shop', 'SELECT * FROM orders LIMIT 10')
    ).resolves.toEqual({
      outcomes: [expect.objectContaining({ hasLimit: true })],
    });
  });

  test('sends nothing at all when the editor holds no statement', async () => {
    await expect(
      runAction('shop', '-- nothing to run yet\n')
    ).resolves.toEqual({ outcomes: [] });

    expect(window.sql.executeQuery).not.toHaveBeenCalled();
  });
});
