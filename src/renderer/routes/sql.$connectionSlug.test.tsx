/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { action } from './sql.$connectionSlug';

function runAction(databaseName: string, raw: string) {
  const formData = new FormData();
  formData.set('raw', raw);

  return action({
    params: { connectionSlug: 'connectionSlug', databaseName },
    request: new Request('http://localhost', {
      method: 'POST',
      body: formData,
    }),
    context: {},
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

  // The result panel gates the chart tab on this: a partial result set would
  // draw a chart that looks right and is not.
  test('reports whether the query limited its result set', async () => {
    await expect(runAction('shop', 'SELECT * FROM orders')).resolves.toEqual(
      expect.objectContaining({ hasLimit: false })
    );

    await expect(
      runAction('shop', 'SELECT * FROM orders LIMIT 10')
    ).resolves.toEqual(expect.objectContaining({ hasLimit: true }));
  });
});
