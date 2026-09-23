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
  const [rows] = toTableStructure('article', columns, foreignKeys);

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
            table: 'article',
            column: 'auteur_id',
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
            table: 'commentaire',
            column: 'auteur_id',
            referencedTable: 'auteur',
            referencedColumn: 'id',
          },
        ]
      )
    ).toEqual([null]);
  });

  // what `GROUP_CONCAT(DISTINCT …)` used to answer
  test('every target is listed, each once', () => {
    const key = (referencedTable: string): ForeignKey => ({
      table: 'article',
      column: 'auteur_id',
      referencedTable,
      referencedColumn: 'id',
    });

    expect(
      references(
        [column('auteur_id')],
        [key('auteur'), key('personne'), key('auteur')]
      )
    ).toEqual(['auteur.id, personne.id']);
  });

  test('the columns keep the order the dialect answered them in', () => {
    const [rows] = toTableStructure('article', [column('b'), column('a')], []);

    expect(rows.map((row) => row.Column)).toEqual(['b', 'a']);
  });

  // the grid reads a cell by its field's name,
  // so a head without a key would be an empty column
  test('every field names a key of the row', () => {
    const [[row], fields] = toTableStructure('article', [column('id')], []);

    expect(fields.map((field) => field.name).sort()).toEqual(
      Object.keys(row).sort()
    );
  });
});
