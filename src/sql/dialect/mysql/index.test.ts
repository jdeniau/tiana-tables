import { describe, expect, it } from 'vitest';
import { mysqlDialect } from '.';

describe('mysqlDialect', () => {
  it('names a table by its database, each part quoted on its own', () => {
    expect(mysqlDialect.qualify('my-db', 'a.b')).toBe('`my-db`.`a.b`');
  });

  it('switches database with a statement of its own', () => {
    expect(mysqlDialect.useDatabase('my-db')).toBe('USE `my-db`;');
  });

  // the escaping itself is the driver's, and testing its table is not our job
  it('hands a literal to the driver, quotes included', () => {
    expect(mysqlDialect.escapeLiteral("O'Brien")).toBe("'O\\'Brien'");
  });

  it('writes a boolean as the number MySQL holds it as', () => {
    expect(mysqlDialect.booleanLiteral(true)).toBe('1');
    expect(mysqlDialect.booleanLiteral(false)).toBe('0');
  });

  it('tells the databases the server keeps for itself', () => {
    expect(mysqlDialect.isSystemDatabase('information_schema')).toBe(true);
    expect(mysqlDialect.isSystemDatabase('mysql')).toBe(true);
    expect(mysqlDialect.isSystemDatabase('performance_schema')).toBe(true);
    expect(mysqlDialect.isSystemDatabase('sys')).toBe(true);
    expect(mysqlDialect.isSystemDatabase('tiana_dev')).toBe(false);
    expect(mysqlDialect.isSystemDatabase('mysql_app')).toBe(false);
  });

  describe('deleteRows', () => {
    it('deletes each row by its whole key, bounded to their number', () => {
      const { sql, values } = mysqlDialect.deleteRows({
        database: 'shop',
        table: 'order_line',
        rows: [
          [
            { column: 'order_id', value: 1 },
            { column: 'line_id', value: 2 },
          ],
          [
            { column: 'order_id', value: 1 },
            { column: 'line_id', value: 3 },
          ],
        ],
      });

      expect(sql).toBe(
        'DELETE FROM `shop`.`order_line` WHERE ' +
          '(`order_id` = :row0Key0 AND `line_id` = :row0Key1) OR ' +
          '(`order_id` = :row1Key0 AND `line_id` = :row1Key1) LIMIT 2'
      );
      expect(values).toEqual({
        row0Key0: 1,
        row0Key1: 2,
        row1Key0: 1,
        row1Key1: 3,
      });
    });

    // a WHERE with no term would delete the whole table
    it('refuses to delete no row', () => {
      expect(() =>
        mysqlDialect.deleteRows({ database: 'shop', table: 't', rows: [] })
      ).toThrow();
      expect(() =>
        mysqlDialect.deleteRows({ database: 'shop', table: 't', rows: [[]] })
      ).toThrow();
    });
  });

  describe('selectRow', () => {
    it('reads one row by every column of its key', () => {
      const { sql, values } = mysqlDialect.selectRow({
        database: 'tiana_dev',
        table: 'article_media',
        key: [
          { column: 'article_id', value: '9' },
          { column: 'media_id', value: 237 },
        ],
      });

      expect(sql).toBe(
        'SELECT * FROM `tiana_dev`.`article_media` ' +
          'WHERE `article_id` = :key0 AND `media_id` = :key1 LIMIT 1'
      );
      expect(values).toEqual({ key0: '9', key1: 237 });
    });

    // a WHERE with no term would read the whole table
    it('refuses a key of no column', () => {
      expect(() =>
        mysqlDialect.selectRow({ database: 'shop', table: 't', key: [] })
      ).toThrow();
    });
  });

  describe('selectLabels', () => {
    it('reads the key and the start of the label of every row named', () => {
      const { sql, values } = mysqlDialect.selectLabels({
        database: 'tiana_dev',
        table: 'article_media',
        labelColumn: 'legende_specifique',
        keys: [
          [
            { column: 'article_id', value: 9 },
            { column: 'media_id', value: 237 },
          ],
          [
            { column: 'article_id', value: 12 },
            { column: 'media_id', value: '240' },
          ],
        ],
      });

      expect(sql).toBe(
        'SELECT `article_id`, `media_id`, LEFT(`legende_specifique`, 100) ' +
          'FROM `tiana_dev`.`article_media` ' +
          'WHERE (`article_id` = :row0Key0 AND `media_id` = :row0Key1) ' +
          'OR (`article_id` = :row1Key0 AND `media_id` = :row1Key1)'
      );
      expect(values).toEqual({
        row0Key0: 9,
        row0Key1: 237,
        row1Key0: 12,
        row1Key1: '240',
      });
    });

    // a WHERE with no term would read the whole table
    it('refuses no key, or a key of no column', () => {
      expect(() =>
        mysqlDialect.selectLabels({
          database: 'shop',
          table: 't',
          labelColumn: 'name',
          keys: [],
        })
      ).toThrow();
      expect(() =>
        mysqlDialect.selectLabels({
          database: 'shop',
          table: 't',
          labelColumn: 'name',
          keys: [[]],
        })
      ).toThrow();
    });
  });
});
