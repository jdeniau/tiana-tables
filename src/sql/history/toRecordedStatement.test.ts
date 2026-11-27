import { describe, expect, test } from 'vitest';
import { DatabaseEngine } from '../engine';
import { Clause } from './recordedStatement';
import { toRecordedStatement } from './toRecordedStatement';

const { MySQL, PostgreSQL } = DatabaseEngine;

function shapeOf(sql: string, engine = MySQL): string | undefined {
  return toRecordedStatement(sql, engine)?.shape;
}

describe('the shape a statement is counted by', () => {
  test('is the same whatever the values, the blanks and the case of the keywords', () => {
    expect(shapeOf('select * from article where id = 1234;')).toBe(
      'SELECT * FROM article WHERE id = ?'
    );
    expect(
      shapeOf('SELECT *\n  FROM article -- the one\n  WHERE id = 87')
    ).toBe('SELECT * FROM article WHERE id = ?');
  });

  test('holds a single value for a list of them', () => {
    expect(
      shapeOf("SELECT * FROM article WHERE statut IN ('brouillon', 'publie')")
    ).toBe('SELECT * FROM article WHERE statut IN ( ? )');
  });

  test('names a table rather than its alias', () => {
    const expected =
      'SELECT article . titre FROM article JOIN auteur ON auteur . id = article . auteur_id';

    expect(
      shapeOf(
        'SELECT a.titre FROM article a JOIN auteur AS au ON au.id = a.auteur_id'
      )
    ).toBe(expected);
    expect(
      shapeOf(
        'SELECT art.titre FROM article art JOIN auteur ON auteur.id = art.auteur_id'
      )
    ).toBe(expected);
  });

  test('tells a MySQL string from a backquoted name', () => {
    expect(shapeOf('SELECT `statut` FROM `article` WHERE titre = "Une"')).toBe(
      'SELECT `statut` FROM `article` WHERE titre = ?'
    );
  });

  test('reads every kind of PostgreSQL value as one', () => {
    expect(
      shapeOf(
        `SELECT "Titre" FROM article WHERE corps = $$a 'b'$$ AND id = 12 AND note > 3.5 AND drapeaux = B'01'`,
        PostgreSQL
      )
    ).toBe(
      'SELECT "Titre" FROM article WHERE corps = ? AND id = ? AND note > ? AND drapeaux = ?'
    );
  });
});

describe('the clauses of a SELECT', () => {
  test('are cut at their keywords, each one kept as written', () => {
    const recorded = toRecordedStatement(
      "SELECT LEFT(a.titre, 3) FROM article a LEFT OUTER JOIN auteur au ON au.id = a.auteur_id WHERE a.statut = 'publie' ORDER BY a.id DESC LIMIT 10",
      MySQL
    );

    expect(recorded?.blocks).toEqual([
      {
        clause: Clause.Select,
        sql: 'SELECT LEFT(a.titre, 3)',
        shape: 'SELECT LEFT ( article . titre , ? )',
        tables: [],
      },
      {
        clause: Clause.From,
        sql: 'FROM article a',
        shape: 'FROM article',
        tables: [],
      },
      {
        clause: Clause.Join,
        sql: 'LEFT OUTER JOIN auteur au ON au.id = a.auteur_id',
        shape: 'LEFT OUTER JOIN auteur ON auteur . id = article . auteur_id',
        tables: [],
      },
      {
        clause: Clause.Where,
        sql: "WHERE a.statut = 'publie'",
        shape: 'WHERE article . statut = ?',
        tables: [],
      },
      {
        clause: Clause.OrderBy,
        sql: 'ORDER BY a.id DESC',
        shape: 'ORDER BY article . id DESC',
        tables: [],
      },
      { clause: Clause.Limit, sql: 'LIMIT 10', shape: 'LIMIT ?', tables: [] },
    ]);
    expect(recorded?.aliases).toEqual({ a: 'article', au: 'auteur' });
  });

  test('name the tables of the statement where they name a column without its table', () => {
    const recorded = toRecordedStatement(
      'SELECT a.titre, count(*) AS n FROM auteur au JOIN article a ON a.auteur_id = au.id WHERE statut = 1 GROUP BY a.titre',
      MySQL
    );

    expect(
      recorded?.blocks.map(({ clause, tables }) => [clause, tables])
    ).toEqual([
      [Clause.Select, []],
      [Clause.From, []],
      [Clause.Join, []],
      [Clause.Where, ['article', 'auteur']],
      [Clause.GroupBy, []],
    ]);
  });

  test('name no table for the type of a PostgreSQL cast', () => {
    const recorded = toRecordedStatement(
      "SELECT * FROM article a WHERE a.meta::jsonb = '{}'",
      PostgreSQL
    );

    expect(recorded?.blocks.at(-1)).toMatchObject({
      shape: 'WHERE article . meta :: jsonb = ?',
      tables: [],
    });
  });

  test('name no table for a database nor a function', () => {
    const recorded = toRecordedStatement(
      "SELECT * FROM blog.article a WHERE date_format(a.created_at, '%Y') = '2026'",
      MySQL
    );

    expect(
      recorded?.blocks.map(({ shape, tables }) => [shape, tables])
    ).toEqual([
      ['SELECT *', []],
      ['FROM blog . article', []],
      ['WHERE date_format ( article . created_at , ? ) = ?', []],
    ]);
  });

  test('keep a subquery inside the clause it is written in', () => {
    const recorded = toRecordedStatement(
      'SELECT * FROM article WHERE auteur_id IN (SELECT id FROM auteur WHERE actif = 1)',
      PostgreSQL
    );

    expect(recorded?.blocks.map(({ clause }) => clause)).toEqual([
      Clause.Select,
      Clause.From,
      Clause.Where,
    ]);
  });

  test('are not cut at a FROM or a GROUP that opens none', () => {
    const recorded = toRecordedStatement(
      'SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY prix) FROM article a WHERE a.parent_id IS DISTINCT FROM a.id',
      PostgreSQL
    );

    expect(recorded?.blocks.map(({ sql }) => sql)).toEqual([
      'SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY prix)',
      'FROM article a',
      'WHERE a.parent_id IS DISTINCT FROM a.id',
    ]);
  });

  test('stop at the end of the first SELECT of a compound one', () => {
    const recorded = toRecordedStatement(
      'SELECT id FROM article UNION SELECT id FROM auteur',
      MySQL
    );

    expect(recorded?.blocks.map(({ sql }) => sql)).toEqual([
      'SELECT id',
      'FROM article',
    ]);
  });

  test('are none for any other statement', () => {
    expect(
      toRecordedStatement(
        "UPDATE article SET statut = 'publie' WHERE id = 3",
        MySQL
      )
    ).toEqual({
      sql: "UPDATE article SET statut = 'publie' WHERE id = 3",
      shape: 'UPDATE article SET statut = ? WHERE id = ?',
      aliases: {},
      blocks: [],
    });
  });
});

describe('a statement the history keeps', () => {
  test.each([
    'SELECT * FROM tag',
    "INSERT INTO tag (nom) VALUES ('sql')",
    "UPDATE tag SET nom = 'sql' WHERE id = 3",
    'DELETE FROM tag WHERE id = 3',
    'WITH vieux AS (SELECT id FROM tag) DELETE FROM tag WHERE id IN (SELECT id FROM vieux)',
  ])('reads or writes rows: %s', (sql) => {
    expect(toRecordedStatement(sql, MySQL)).not.toBeNull();
  });
});

describe('a statement left out of the history', () => {
  test.each([
    ["CREATE USER 'app'@'%' IDENTIFIED BY 'S3cret!'", MySQL],
    ["ALTER USER 'app'@'%' IDENTIFIED BY 'S3cret!'", MySQL],
    ["GRANT ALL ON *.* TO 'app'@'%' IDENTIFIED BY 'S3cret!'", MySQL],
    ["SET PASSWORD FOR 'app'@'%' = 'S3cret!'", MySQL],
    ["CREATE ROLE app LOGIN PASSWORD 'S3cret!'", PostgreSQL],
    ["ALTER ROLE app PASSWORD 'S3cret!'", PostgreSQL],
    ['ALTER TABLE tag ADD COLUMN couleur TEXT', MySQL],
    ['DROP TABLE tag', MySQL],
    ['TRUNCATE TABLE tag', MySQL],
    ['SHOW TABLES', MySQL],
    ['CALL recalcule_vues()', MySQL],
  ])('neither reads nor writes rows: %s', (sql, engine) => {
    expect(toRecordedStatement(sql, engine)).toBeNull();
  });

  test('is not one touching a column named password', () => {
    expect(
      shapeOf("UPDATE utilisateur SET password = '$2y$10$abc' WHERE id = 3")
    ).toBe('UPDATE utilisateur SET password = ? WHERE id = ?');
  });

  test('holds no code', () => {
    expect(toRecordedStatement('-- nothing to run\n;', MySQL)).toBeNull();
  });

  test('is data being loaded', () => {
    const values = Array.from({ length: 2000 }, (_, i) => `(${i})`).join(', ');

    expect(
      toRecordedStatement(`INSERT INTO t (id) VALUES ${values}`, MySQL)
    ).toBeNull();
  });
});
