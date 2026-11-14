import { describe, expect, test } from 'vitest';
import { ColumnDetailHelper } from '../../sql/ColumnDetailHelper';
import { ForeignKeysHelper } from '../../sql/ForeignKeysHelper';
import type { ColumnDetail, ForeignKey } from '../../sql/dialect/metadata';
import {
  type GridColumn,
  keyText,
  labelColumnOf,
  labelledKeys,
  labelsByKey,
  labelsRequest,
  rowKeyText,
} from './foreignKeyLabels';

// the keys of `envoi_newsletter` in the dev dataset: `article_une_id` belongs to two
const FOREIGN_KEYS: Array<ForeignKey> = [
  {
    constraintName: 'fk_envoi_article',
    table: 'envoi_newsletter',
    column: 'article_une_id',
    referencedDatabase: 'tiana_dev',
    referencedTable: 'article',
    referencedColumn: 'id',
  },
  {
    constraintName: 'fk_envoi_media_une',
    table: 'envoi_newsletter',
    column: 'article_une_id',
    referencedDatabase: 'tiana_dev',
    referencedTable: 'article_media',
    referencedColumn: 'article_id',
  },
  {
    constraintName: 'fk_envoi_media_une',
    table: 'envoi_newsletter',
    column: 'media_une_id',
    referencedDatabase: 'tiana_dev',
    referencedTable: 'article_media',
    referencedColumn: 'media_id',
  },
  {
    constraintName: 'fk_envoi_newsletter',
    table: 'envoi_newsletter',
    column: 'newsletter_id',
    referencedDatabase: 'archive',
    referencedTable: 'newsletter',
    referencedColumn: 'id',
  },
];

function columnsOf(
  table: string,
  names: Array<string>,
  binary: Array<string> = []
): Array<ColumnDetail> {
  return names.map((name) => ({
    table,
    name,
    nullable: false,
    generated: false,
    binary: binary.includes(name),
    hasJsonType: false,
    allowedValues: [],
    multiValued: false,
  }));
}

const ALL_COLUMNS = new ColumnDetailHelper([
  ...columnsOf('article', ['id', 'titre', 'slug']),
  // a table of the same name as the one the key to `archive` points at
  ...columnsOf('newsletter', ['id', 'nom']),
  ...columnsOf('article_media', [
    'article_id',
    'media_id',
    'position',
    'legende_specifique',
  ]),
]);

const gridColumn = (name: string, fieldIndex: number): GridColumn => ({
  id: name,
  fieldIndex,
  name,
  tableName: 'envoi_newsletter',
});

const ID = gridColumn('id', 0);
const NEWSLETTER = gridColumn('newsletter_id', 1);
const ARTICLE = gridColumn('article_une_id', 2);
const MEDIA = gridColumn('media_une_id', 3);

function keysOf(
  columns: Array<GridColumn>,
  displayAfterByTable: Record<string, Record<string, string>> = {},
  foreignKeys: Array<ForeignKey> = FOREIGN_KEYS
) {
  return labelledKeys(
    columns,
    new ForeignKeysHelper(foreignKeys, 'tiana_dev'),
    ALL_COLUMNS,
    'tiana_dev',
    (table) => displayAfterByTable[table]
  );
}

describe('labelColumnOf', () => {
  const article = columnsOf('article', ['id', 'titre', 'slug']);

  test('the first column after the key names the rows', () => {
    expect(labelColumnOf(article, ['id'], undefined)).toBe('titre');
  });

  test('the order the user gave the table decides which one comes first', () => {
    expect(labelColumnOf(article, ['id'], { slug: 'id' })).toBe('slug');
  });

  test('a composite key leaves all of its columns aside', () => {
    expect(
      labelColumnOf(
        columnsOf('article_media', ['article_id', 'media_id', 'position']),
        ['article_id', 'media_id'],
        undefined
      )
    ).toBe('position');
  });

  test('bytes name no row, and neither does a table of no other column', () => {
    expect(
      labelColumnOf(columnsOf('t', ['id', 'hash'], ['hash']), ['id'], undefined)
    ).toBeNull();
    expect(labelColumnOf(columnsOf('t', ['id']), ['id'], undefined)).toBeNull();
  });
});

describe('labelledKeys', () => {
  test('a column of two keys shows the one of its own, and the composite key labels its other column', () => {
    expect(
      keysOf([ID, NEWSLETTER, ARTICLE, MEDIA]).map(
        ({ columnId, foreignKey, labelColumn, keyColumns }) => ({
          columnId,
          table: foreignKey.referencedTable,
          labelColumn,
          keyColumns: keyColumns.map(({ id }) => id),
        })
      )
    ).toEqual([
      {
        columnId: 'article_une_id',
        table: 'article',
        labelColumn: 'titre',
        keyColumns: ['article_une_id'],
      },
      {
        columnId: 'media_une_id',
        table: 'article_media',
        labelColumn: 'position',
        keyColumns: ['article_une_id', 'media_une_id'],
      },
    ]);
  });

  test('a composite key labels its last column shown, in the order of the grid', () => {
    const compositeOnly = FOREIGN_KEYS.filter(
      ({ constraintName }) => constraintName === 'fk_envoi_media_une'
    );

    expect(
      keysOf([ID, ARTICLE, MEDIA], {}, compositeOnly).map(
        ({ columnId }) => columnId
      )
    ).toEqual(['media_une_id']);
    expect(
      keysOf([ID, MEDIA, ARTICLE], {}, compositeOnly).map(
        ({ columnId }) => columnId
      )
    ).toEqual(['article_une_id']);
  });

  test('a key of one column keeps its column, whichever key the server lists first', () => {
    expect(
      keysOf([ID, ARTICLE, MEDIA], {}, FOREIGN_KEYS.toReversed()).map(
        ({ columnId, foreignKey }) => [columnId, foreignKey.referencedTable]
      )
    ).toEqual([
      ['article_une_id', 'article'],
      ['media_une_id', 'article_media'],
    ]);
  });

  test('a composite key whose last column shown has a key of its own labels the column before', () => {
    expect(
      keysOf([ID, MEDIA, ARTICLE]).map(({ columnId, foreignKey }) => [
        columnId,
        foreignKey.referencedTable,
      ])
    ).toEqual([
      ['article_une_id', 'article'],
      ['media_une_id', 'article_media'],
    ]);
  });

  test('a composite key the grid holds part of labels nothing', () => {
    expect(
      keysOf([ID, MEDIA]).map(({ foreignKey }) => foreignKey.referencedTable)
    ).toEqual([]);
  });

  test('a key to another database labels nothing, even where a table of the current one is named alike', () => {
    expect(keysOf([NEWSLETTER])).toEqual([]);
  });

  test('the label column follows the order given to the referenced table', () => {
    expect(keysOf([ARTICLE], { article: { slug: 'id' } })[0].labelColumn).toBe(
      'slug'
    );
  });

  test('a column of a raw query that belongs to no table labels nothing', () => {
    expect(keysOf([{ ...ARTICLE, tableName: undefined }])).toEqual([]);
  });
});

describe('keys and labels', () => {
  const [, composite] = keysOf([ID, NEWSLETTER, ARTICLE, MEDIA]);

  test('a key is found by its values whatever their type, and holds no NULL, bytes or object', () => {
    expect(keyText([9, '237'])).toBe('["9","237"]');
    expect(keyText(['9', 237])).toBe('["9","237"]');
    expect(keyText([9, null])).toBeNull();
    expect(keyText([new Uint8Array([1])])).toBeNull();
    expect(keyText([{ x: 1 }])).toBeNull();
  });

  test('the rows of a result read as objects or as arrays point at the same key', () => {
    expect(
      rowKeyText({ article_une_id: 9, media_une_id: 237 }, composite, false)
    ).toBe(rowKeyText([1, 2, 9, 237] as never, composite, true));
  });

  test('each key is asked once, by the referenced columns, and a key holding a NULL not at all', () => {
    expect(
      labelsRequest(
        [
          { article_une_id: 9, media_une_id: 237 },
          { article_une_id: 9, media_une_id: 237 },
          { article_une_id: 9, media_une_id: null },
          { article_une_id: 12, media_une_id: 240 },
        ],
        composite,
        false
      )
    ).toEqual({
      database: 'tiana_dev',
      table: 'article_media',
      labelColumn: 'position',
      keys: [
        [
          { column: 'article_id', value: 9 },
          { column: 'media_id', value: 237 },
        ],
        [
          { column: 'article_id', value: 12 },
          { column: 'media_id', value: 240 },
        ],
      ],
    });
  });

  test('rows pointing nowhere ask nothing', () => {
    expect(
      labelsRequest(
        [{ article_une_id: null, media_une_id: null }],
        composite,
        false
      )
    ).toBeNull();
  });

  test('a label is text or a number; NULL, bytes and an empty text name nothing', () => {
    expect(
      labelsByKey([
        { key: [9, 237], label: 'Une' },
        { key: [12, 240], label: 2 },
        { key: [13, 241], label: null },
        { key: [14, 242], label: new Uint8Array([1]) },
        { key: [15, 243], label: '' },
      ])
    ).toEqual({
      '["9","237"]': 'Une',
      '["12","240"]': '2',
    });
  });
});
