import { describe, expect, test } from 'vitest';
import type { WholeForeignKey } from '../../../sql/ForeignKeysHelper';
import { FieldKind, type ResultField } from '../../../sql/resultField';
import { linkedRowFields, linkedRowKey, linkedRowKeyText } from './linkedRow';

const AUTEUR: WholeForeignKey = {
  referencedDatabase: 'tiana_dev',
  referencedTable: 'auteur',
  columns: [{ column: 'auteur_id', referencedColumn: 'id' }],
};

// `envoi_newsletter (article_une_id, media_une_id)` → `article_media`
const ARTICLE_MEDIA: WholeForeignKey = {
  referencedDatabase: 'tiana_dev',
  referencedTable: 'article_media',
  columns: [
    { column: 'article_une_id', referencedColumn: 'article_id' },
    { column: 'media_une_id', referencedColumn: 'media_id' },
  ],
};

const ENVOI = { id: 13, article_une_id: 9, media_une_id: 237 };

const typed = (text: string) => ({ isNull: false, text });

describe('linkedRowKey', () => {
  test('a key of one column looks the draft up', () => {
    expect(
      linkedRowKey(AUTEUR, 'auteur_id', typed('32'), FieldKind.Number, {
        id: 1,
        auteur_id: 4,
      })
    ).toEqual([{ column: 'id', value: '32' }]);
  });

  test("the other columns of a composite key take the row's value", () => {
    expect(
      linkedRowKey(
        ARTICLE_MEDIA,
        'media_une_id',
        typed('188'),
        FieldKind.Number,
        ENVOI
      )
    ).toEqual([
      { column: 'article_id', value: 9 },
      { column: 'media_id', value: '188' },
    ]);
  });

  test('NULL, or nothing typed, looks nothing up', () => {
    expect(
      linkedRowKey(
        AUTEUR,
        'auteur_id',
        { isNull: true, text: '' },
        FieldKind.Number,
        {}
      )
    ).toBeNull();
    expect(
      linkedRowKey(AUTEUR, 'auteur_id', typed('  '), FieldKind.Number, {})
    ).toBeNull();
  });

  test.each(['3a', '1e3', '0x1A', 'Infinity'])(
    'a number column does not look up %s',
    (draft) => {
      expect(
        linkedRowKey(AUTEUR, 'auteur_id', typed(draft), FieldKind.Number, {})
      ).toBeNull();
    }
  );

  test('a number column looks up its draft without the spaces around it', () => {
    expect(
      linkedRowKey(AUTEUR, 'auteur_id', typed(' -3.5 '), FieldKind.Number, {})
    ).toEqual([{ column: 'id', value: '-3.5' }]);
  });

  test('a text column looks up any text', () => {
    const byCode: WholeForeignKey = {
      ...AUTEUR,
      columns: [{ column: 'code', referencedColumn: 'code' }],
    };

    expect(
      linkedRowKey(byCode, 'code', typed('3a'), FieldKind.String, {})
    ).toEqual([{ column: 'code', value: '3a' }]);
  });

  // MATCH SIMPLE: the server checks no key holding a NULL
  test('another column of the key at NULL looks nothing up', () => {
    expect(
      linkedRowKey(
        ARTICLE_MEDIA,
        'article_une_id',
        typed('9'),
        FieldKind.Number,
        { ...ENVOI, media_une_id: null }
      )
    ).toBeNull();
  });
});

describe('linkedRowFields', () => {
  const field = (name: string): ResultField => ({
    name,
    table: 'auteur',
    kind: FieldKind.String,
  });
  const FIELDS = ['id', 'nom', 'prenom', 'email'].map(field);
  const ROW = { id: 32, nom: 'Bourgeois', prenom: 'Valerie', email: 'v@b.fr' };

  const names = (displayAfterByColumn?: Record<string, string>) =>
    linkedRowFields(ROW, FIELDS, ['id'], displayAfterByColumn).map(
      ({ field: { name }, text }) => `${name}=${text}`
    );

  test("leaves the key out, the rest in the server's order", () => {
    expect(names()).toEqual([
      'nom=Bourgeois',
      'prenom=Valerie',
      'email=v@b.fr',
    ]);
  });

  test('follows the column order configured for the table', () => {
    expect(names({ email: 'id' })).toEqual([
      'email=v@b.fr',
      'nom=Bourgeois',
      'prenom=Valerie',
    ]);
  });
});

test('linkedRowKeyText names every column of the key', () => {
  expect(
    linkedRowKeyText([
      { column: 'article_id', value: 9 },
      { column: 'media_id', value: '237' },
    ])
  ).toBe('article_id = 9, media_id = 237');
});
