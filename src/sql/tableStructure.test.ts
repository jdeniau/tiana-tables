import { describe, expect, test } from 'vitest';
import type { DescribedColumn, ForeignKey } from './dialect/metadata';
import { toTableStructure } from './tableStructure';

function column(name: string): DescribedColumn {
  return {
    Column: name,
    Type: 'int(11)',
    Null: 'NO',
    Key: '',
    Default: null,
    Extra: '',
    Collation: null,
    Comment: '',
  };
}

function references(
  columns: DescribedColumn[],
  foreignKeys: ForeignKey[]
): Array<string | null> {
  const [rows] = toTableStructure('db', 'article', columns, foreignKeys);

  return rows.map((row) => row.References);
}

describe('toTableStructure', () => {
  test('a column that references nothing says so with a null', () => {
    expect(references([column('id')], [])).toEqual([null]);
  });

  test('a column is paired with the column it references', () => {
    expect(
      references(
        [column('id'), column('auteur_id')],
        [
          {
            constraintName: 'fk_article_auteur',
            table: 'article',
            column: 'auteur_id',
            referencedDatabase: 'db',
            referencedTable: 'auteur',
            referencedColumn: 'id',
          },
        ]
      )
    ).toEqual([null, 'auteur.id']);
  });

  // the foreign keys are the whole database's,
  // where another table may have a column of the same name
  test('a key of another table is not this one’s', () => {
    expect(
      references(
        [column('auteur_id')],
        [
          {
            constraintName: 'fk_commentaire_auteur',
            table: 'commentaire',
            column: 'auteur_id',
            referencedDatabase: 'db',
            referencedTable: 'auteur',
            referencedColumn: 'id',
          },
        ]
      )
    ).toEqual([null]);
  });

  test('a column referencing another database names it', () => {
    expect(
      references(
        [column('auteur_id')],
        [
          {
            constraintName: 'fk_article_auteur',
            table: 'article',
            column: 'auteur_id',
            referencedDatabase: 'accounts',
            referencedTable: 'auteur',
            referencedColumn: 'id',
          },
        ]
      )
    ).toEqual(['accounts.auteur.id']);
  });

  // what `GROUP_CONCAT(DISTINCT …)` used to answer
  test('every target is listed, each once', () => {
    const key = (
      constraintName: string,
      referencedTable: string
    ): ForeignKey => ({
      constraintName,
      table: 'article',
      column: 'auteur_id',
      referencedDatabase: 'db',
      referencedTable,
      referencedColumn: 'id',
    });

    expect(
      references(
        [column('auteur_id')],
        [
          key('fk_article_auteur', 'auteur'),
          key('fk_article_personne', 'personne'),
          key('fk_article_auteur_bis', 'auteur'),
        ]
      )
    ).toEqual(['auteur.id, personne.id']);
  });

  // keys of `envoi_newsletter` as the dev servers answer them
  describe('a composite foreign key', () => {
    const composite = (
      column: string,
      referencedColumn: string
    ): ForeignKey => ({
      constraintName: 'fk_envoi_media_une',
      table: 'envoi_newsletter',
      column,
      referencedDatabase: 'db',
      referencedTable: 'article_media',
      referencedColumn,
    });
    const keys: ForeignKey[] = [
      {
        constraintName: 'fk_envoi_article',
        table: 'envoi_newsletter',
        column: 'article_une_id',
        referencedDatabase: 'db',
        referencedTable: 'article',
        referencedColumn: 'id',
      },
      composite('article_une_id', 'article_id'),
      composite('media_une_id', 'media_id'),
    ];

    test('is written whole on each of its columns', () => {
      const [rows] = toTableStructure(
        'db',
        'envoi_newsletter',
        [column('article_une_id'), column('media_une_id')],
        keys
      );

      expect(rows.map((row) => row.References)).toEqual([
        'article.id, article_media (article_id, media_id)',
        'article_media (article_id, media_id)',
      ]);
    });

    // PostgreSQL lets two tables name a key alike
    test('takes no column from a key of another table named alike', () => {
      const [rows] = toTableStructure(
        'db',
        'envoi_newsletter',
        [column('media_une_id')],
        [
          composite('media_une_id', 'media_id'),
          { ...composite('media_id', 'id'), table: 'article_media' },
        ]
      );

      expect(rows.map((row) => row.References)).toEqual([
        'article_media.media_id',
      ]);
    });

    test('names the database of its table when it is another one', () => {
      const [rows] = toTableStructure(
        'db',
        'envoi_newsletter',
        [column('media_une_id')],
        keys.map((key) => ({ ...key, referencedDatabase: 'archives' }))
      );

      expect(rows.map((row) => row.References)).toEqual([
        'archives.article_media (article_id, media_id)',
      ]);
    });
  });

  test('the columns keep the order the dialect answered them in', () => {
    const [rows] = toTableStructure(
      'db',
      'article',
      [column('b'), column('a')],
      []
    );

    expect(rows.map((row) => row.Column)).toEqual(['b', 'a']);
  });

  // the grid reads a cell by its field's name,
  // so a head without a key would be an empty column
  test('every field names a key of the row', () => {
    const [[row], fields] = toTableStructure(
      'db',
      'article',
      [column('id')],
      []
    );

    expect(fields.map((field) => field.name).sort()).toEqual(
      Object.keys(row).sort()
    );
  });
});
