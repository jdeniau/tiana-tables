import { describe, expect, test } from 'vitest';
import { ColumnDetailHelper } from '../../sql/ColumnDetailHelper';
import { ForeignKeysHelper } from '../../sql/ForeignKeysHelper';
import type { ColumnDetail, ForeignKey } from '../../sql/dialect/metadata';
import {
  type GridColumn,
  findLabel,
  labelColumnOf,
  labelledKeys,
  labelsByKey,
  labelsRequest,
} from './foreignKeyLabels';

// the keys of `envoi_newsletter` in the dev dataset, `article_une_id` belonging to two, and one of `article`
const FOREIGN_KEYS: Array<ForeignKey> = [
  {
    constraintName: 'fk_article_auteur',
    table: 'article',
    column: 'auteur_id',
    referencedDatabase: 'tiana_dev',
    referencedTable: 'auteur',
    referencedColumn: 'id',
  },
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
  // a key of its own before the column naming its rows
  ...columnsOf('article', ['id', 'auteur_id', 'titre', 'slug']),
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

  test('bytes and the columns of a key are passed over for the next column', () => {
    expect(
      labelColumnOf(
        columnsOf('t', ['id', 'hash', 'contract_id', 'label'], ['hash']),
        ['id', 'contract_id'],
        undefined
      )
    ).toBe('label');
  });

  test('a table of keys and bytes only has no label', () => {
    expect(
      labelColumnOf(columnsOf('t', ['id', 'hash'], ['hash']), ['id'], undefined)
    ).toBeNull();
    expect(labelColumnOf(columnsOf('t', ['id']), ['id'], undefined)).toBeNull();
  });
});

describe('labelledKeys', () => {
  test('a column of its own key shows its label, and a composite key none', () => {
    expect(
      keysOf([ID, NEWSLETTER, ARTICLE, MEDIA]).map(
        ({ column, referencedTable, referencedColumn, labelColumn }) => ({
          column: column.id,
          referencedTable,
          referencedColumn,
          labelColumn,
        })
      )
    ).toEqual([
      {
        column: 'article_une_id',
        referencedTable: 'article',
        referencedColumn: 'id',
        labelColumn: 'titre',
      },
    ]);
  });

  test('a column of a composite key and of its own shows its own, whichever the server lists first', () => {
    expect(
      keysOf([ID, ARTICLE, MEDIA], {}, FOREIGN_KEYS.toReversed()).map(
        ({ column, referencedTable }) => [column.id, referencedTable]
      )
    ).toEqual([['article_une_id', 'article']]);
  });

  test('a key to another database labels nothing, even where a table of the current one is named alike', () => {
    expect(keysOf([NEWSLETTER])).toEqual([]);
  });

  test('a key of the referenced table holds none of its labels', () => {
    expect(keysOf([ARTICLE])[0].labelColumn).toBe('titre');
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
  const [article] = keysOf([ID, ARTICLE]);

  test('each key is asked once, by the referenced column, and a NULL, bytes or an object not at all', () => {
    expect(
      labelsRequest(
        [
          { article_une_id: 9 },
          { article_une_id: 9 },
          { article_une_id: null },
          { article_une_id: new Uint8Array([1]) },
          { article_une_id: { x: 1 } },
          { article_une_id: 12 },
        ],
        article,
        false
      )
    ).toEqual({
      database: 'tiana_dev',
      table: 'article',
      keyColumn: 'id',
      labelColumn: 'titre',
      keys: [9, 12],
    });
  });

  test('a result read as arrays is read by the index of the column', () => {
    expect(labelsRequest([[1, 2, 9]] as never, article, true)?.keys).toEqual([
      9,
    ]);
  });

  test('rows pointing nowhere ask nothing', () => {
    expect(
      labelsRequest([{ article_une_id: null }], article, false)
    ).toBeNull();
  });

  test('a label is the text the server answers: NULL and an empty text name nothing', () => {
    expect(
      labelsByKey([
        { key: 9, label: 'Une' },
        { key: 13, label: null },
        { key: 15, label: '' },
      ])
    ).toEqual({ '9': 'Une' });
  });

  test('a label is found by its key whatever its type, and a key named like a method of Object finds none', () => {
    const labels = labelsByKey([{ key: 9, label: 'Une' }]);

    expect(findLabel(labels, 9)).toBe('Une');
    expect(findLabel(labels, '9')).toBe('Une');
    expect(findLabel(labels, 12)).toBeUndefined();
    expect(findLabel(labels, null)).toBeUndefined();
    expect(findLabel(labels, 'constructor')).toBeUndefined();
  });
});
