import { describe, expect, test } from 'vitest';
import { getDialect } from '../../../sql/dialect';
import { DatabaseEngine } from '../../../sql/engine';
import { SortDirection } from '../../../sql/sortOrder';
import { buildTableQuery } from './tableQuery';

const mysql = getDialect(DatabaseEngine.MySQL);
const postgres = getDialect(DatabaseEngine.PostgreSQL);

const page = {
  database: 'shop',
  tableName: 'order_lines',
  primaryKeys: ['order_id', 'line_no'],
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
        sort: { column: 'label', direction: SortDirection.Asc },
      })
    ).toBe(
      'SELECT * FROM `shop`.`order_lines` ORDER BY `label` ASC, `order_id`, `line_no` LIMIT 100 OFFSET 200;'
    );
  });

  test('sorts descending, quoted the way its engine does', () => {
    expect(
      buildTableQuery(postgres, {
        ...page,
        sort: { column: 'label', direction: SortDirection.Desc },
      })
    ).toBe(
      'SELECT * FROM "shop"."order_lines" ORDER BY "label" DESC, "order_id", "line_no" LIMIT 100 OFFSET 200;'
    );
  });

  test('does not repeat a key column that is the sorted one', () => {
    expect(
      buildTableQuery(mysql, {
        ...page,
        sort: { column: 'line_no', direction: SortDirection.Desc },
      })
    ).toContain('ORDER BY `line_no` DESC, `order_id` LIMIT');
  });

  test('sorts a table without a key on the column alone', () => {
    expect(
      buildTableQuery(mysql, {
        ...page,
        primaryKeys: [],
        sort: { column: 'label', direction: SortDirection.Asc },
      })
    ).toContain('ORDER BY `label` ASC LIMIT');
  });

  test("a filter's own order wins over the sorted column", () => {
    expect(
      buildTableQuery(mysql, {
        ...page,
        where: 'label <> "" order by label',
        sort: { column: 'line_no', direction: SortDirection.Desc },
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
