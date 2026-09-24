import { describe, expect, test } from 'vitest';
import { getDialect } from '../../../sql/dialect';
import { DatabaseEngine } from '../../../sql/engine';
import { buildTableQuery } from './tableQuery';

const mysql = getDialect(DatabaseEngine.MySQL);
const postgres = getDialect(DatabaseEngine.PostgreSQL);

const page = {
  database: 'shop',
  tableName: 'order_lines',
  primaryKeys: ['order_id', 'line_no'],
  sorting: [],
  limit: 100,
  offset: 200,
};

describe('buildTableQuery', () => {
  test('pages the table in the order of its primary key', () => {
    expect(buildTableQuery(mysql, page)).toBe(
      'SELECT * FROM `shop`.`order_lines` ORDER BY `order_id`, `line_no` LIMIT 100 OFFSET 200;'
    );
  });

  test('quotes the key the way its engine does', () => {
    expect(buildTableQuery(postgres, page)).toBe(
      'SELECT * FROM "shop"."order_lines" ORDER BY "order_id", "line_no" LIMIT 100 OFFSET 200;'
    );
  });

  test('sends the filter as written, before the order', () => {
    expect(buildTableQuery(mysql, { ...page, where: "label = 'a'" })).toBe(
      "SELECT * FROM `shop`.`order_lines` WHERE label = 'a' ORDER BY `order_id`, `line_no` LIMIT 100 OFFSET 200;"
    );
  });

  // a second `ORDER BY` would be a syntax error
  test("keeps a filter's own order", () => {
    expect(
      buildTableQuery(mysql, { ...page, where: 'label <> "" order by label' })
    ).toBe(
      'SELECT * FROM `shop`.`order_lines` WHERE label <> "" order by label LIMIT 100 OFFSET 200;'
    );
  });

  // a literal keeps its quotes in its token, so it never reads ORDER
  test('does not take a literal saying order for one', () => {
    expect(
      buildTableQuery(mysql, { ...page, where: "status = 'order'" })
    ).toContain('ORDER BY `order_id`');
  });

  test('orders by the sorted column, then by the key for the ties', () => {
    expect(
      buildTableQuery(mysql, {
        ...page,
        sorting: [{ id: 'label', desc: false }],
      })
    ).toBe(
      'SELECT * FROM `shop`.`order_lines` ORDER BY `label` ASC, `order_id`, `line_no` LIMIT 100 OFFSET 200;'
    );
  });

  test('sorts descending, quoted the way its engine does', () => {
    expect(
      buildTableQuery(postgres, {
        ...page,
        sorting: [{ id: 'label', desc: true }],
      })
    ).toBe(
      'SELECT * FROM "shop"."order_lines" ORDER BY "label" DESC, "order_id", "line_no" LIMIT 100 OFFSET 200;'
    );
  });

  test('orders by each sorted column in turn, then by the rest of the key', () => {
    expect(
      buildTableQuery(mysql, {
        ...page,
        sorting: [
          { id: 'label', desc: true },
          { id: 'order_id', desc: false },
        ],
      })
    ).toContain('ORDER BY `label` DESC, `order_id` ASC, `line_no` LIMIT');
  });

  test('does not repeat a key column that is the sorted one', () => {
    expect(
      buildTableQuery(mysql, {
        ...page,
        sorting: [{ id: 'line_no', desc: true }],
      })
    ).toContain('ORDER BY `line_no` DESC, `order_id` LIMIT');
  });

  test('sorts a table without a key on the column alone', () => {
    expect(
      buildTableQuery(mysql, {
        ...page,
        primaryKeys: [],
        sorting: [{ id: 'label', desc: false }],
      })
    ).toContain('ORDER BY `label` ASC LIMIT');
  });

  test("a filter's own order wins over the sorted columns", () => {
    expect(
      buildTableQuery(mysql, {
        ...page,
        where: 'label <> "" order by label',
        sorting: [{ id: 'line_no', desc: true }],
      })
    ).toBe(
      'SELECT * FROM `shop`.`order_lines` WHERE label <> "" order by label LIMIT 100 OFFSET 200;'
    );
  });

  test('leaves a table without a key in the order the server answers', () => {
    expect(buildTableQuery(mysql, { ...page, primaryKeys: [] })).toBe(
      'SELECT * FROM `shop`.`order_lines` LIMIT 100 OFFSET 200;'
    );
  });
});
