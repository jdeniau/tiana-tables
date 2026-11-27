import { describe, expect, it } from 'vitest';
import { DatabaseEngine } from '../engine';
import { HistoryContinuation } from './HistoryContinuation';
import type { HistoryBlock } from './recordedStatement';
import { toRecordedStatement } from './toRecordedStatement';

/** the clauses of a statement as the history loads them, after `runCount` runs */
function blocksOf(sql: string, runCount = 1): Array<HistoryBlock> {
  const recorded = toRecordedStatement(sql, DatabaseEngine.MySQL);

  return (recorded?.blocks ?? []).map((block) => ({
    ...block,
    aliases: recorded?.aliases ?? {},
    runCount,
  }));
}

function ranAfter(runs: Array<string>, typed: string): string | null {
  return new HistoryContinuation({ runs, blocks: [] }).after(
    typed,
    DatabaseEngine.MySQL
  );
}

/** as the history loads them: the most run first */
const BLOCKS = [
  ...blocksOf("SELECT * FROM auteur WHERE nom = 'Ada'", 5),
  ...blocksOf(
    'SELECT * FROM article art JOIN commentaire c ON c.article_id = art.id ORDER BY art.vues DESC',
    3
  ),
  ...blocksOf('SELECT * FROM article art WHERE art.statut = 1', 2),
  ...blocksOf(
    'SELECT * FROM article art JOIN auteur AS au ON au.id = art.auteur_id'
  ),
  ...blocksOf(
    'SELECT * FROM article art JOIN blog.tag t ON t.article_id = art.id'
  ),
];

function blockAfter(typed: string): string | null {
  return new HistoryContinuation({ runs: [], blocks: BLOCKS }).after(
    typed,
    DatabaseEngine.MySQL
  );
}

describe('a text that ran', () => {
  const RUN = 'SELECT * FROM article a WHERE a.statut = 1';

  it('completes the text that starts as typed, up to the end of its clause', () => {
    expect(ranAfter([RUN], 'SELECT * FROM art')).toBe('icle a');
  });

  it('proposes the next clause whole once the caret reaches it', () => {
    expect(ranAfter([RUN], 'SELECT * FROM article a ')).toBe(
      'WHERE a.statut = 1'
    );
    expect(ranAfter([RUN], 'SELECT * FROM article a')).toBe(
      ' WHERE a.statut = 1'
    );
  });

  it('reads the typed text whatever its case and its blanks', () => {
    expect(ranAfter([RUN], 'select *\n  from ARTICLE a ')).toBe(
      'WHERE a.statut = 1'
    );
  });

  it('reads the statement from its first word, past the comments above it', () => {
    expect(ranAfter([RUN], '-- les articles\nSELECT * FROM art')).toBe(
      'icle a'
    );
    expect(ranAfter([RUN], '/* publiés */ SELECT * FROM art')).toBe('icle a');
    expect(ranAfter([RUN], '-- les articles\n')).toBeNull();
  });

  it('ends a word at a blank', () => {
    expect(ranAfter([RUN], 'SELECT * FROM art ')).toBeNull();
  });

  it('takes the first text that matches: the most run shape, then the most recent', () => {
    const runs = ['SELECT * FROM lecture', 'SELECT * FROM article'];

    expect(ranAfter(runs, 'SELECT * FROM ')).toBe('lecture');
    expect(ranAfter(runs, 'SELECT * FROM a')).toBe('rticle');
  });

  it('cuts a write at its clauses too', () => {
    expect(ranAfter(['DELETE FROM article WHERE id = 3'], 'DELETE ')).toBe(
      'FROM article'
    );
    const update = 'UPDATE article SET vues = 0 WHERE id = 3';

    expect(ranAfter([update], 'UPDATE ')).toBe('article');
    expect(ranAfter([update], 'UPDATE article ')).toBe('SET vues = 0');

    const insert = "INSERT INTO tag (nom) VALUES ('sql') RETURNING id";

    expect(ranAfter([insert], 'INSERT ')).toBe('INTO tag (nom)');
    expect(ranAfter([insert], 'INSERT INTO tag (nom) ')).toBe("VALUES ('sql')");
  });

  it('cuts a compound SELECT at each of its clauses', () => {
    const compound =
      'SELECT id FROM article WHERE statut = 1 UNION SELECT id FROM brouillon WHERE auteur_id = 3 ORDER BY id';

    expect(ranAfter([compound], 'SELECT id FROM article ')).toBe(
      'WHERE statut = 1'
    );
    expect(
      ranAfter([compound], 'SELECT id FROM article WHERE statut = 1 ')
    ).toBe('UNION');
    expect(
      ranAfter(
        [compound],
        'SELECT id FROM article WHERE statut = 1 UNION SELECT id '
      )
    ).toBe('FROM brouillon');
  });

  it('proposes nothing past what ran, nor for an empty statement', () => {
    expect(ranAfter([RUN], RUN)).toBeNull();
    expect(ranAfter([RUN], `${RUN} `)).toBeNull();
    expect(ranAfter([RUN], '')).toBeNull();
  });

  it('comes before a clause of the history', () => {
    const continuation = new HistoryContinuation({
      runs: ['SELECT * FROM article a JOIN auteur au ON au.id = a.auteur_id'],
      blocks: BLOCKS,
    });

    expect(
      continuation.after('SELECT * FROM article a JOIN ', DatabaseEngine.MySQL)
    ).toBe('auteur au ON au.id = a.auteur_id');
  });
});

describe('a clause of the history', () => {
  it('proposes the most run join of the query, with its aliases', () => {
    expect(blockAfter('SELECT * FROM article a JOIN ')).toBe(
      'commentaire c ON c.article_id = a.id'
    );
    expect(blockAfter('SELECT * FROM article a LEFT JOIN ')).toBe(
      'commentaire c ON c.article_id = a.id'
    );
  });

  it('renames the joined table when the query already uses its alias', () => {
    expect(
      blockAfter(
        'SELECT * FROM article a JOIN categorie c ON c.id = a.categorie_id JOIN '
      )
    ).toBe('commentaire co ON co.article_id = a.id');
    expect(
      blockAfter(
        'SELECT * FROM article a JOIN commentaire c ON c.article_id = a.id JOIN audience au ON au.article_id = a.id JOIN '
      )
    ).toBe('auteur AS aut ON aut.id = a.auteur_id');
    expect(
      blockAfter(
        'SELECT * FROM article t JOIN commentaire c ON c.article_id = t.id JOIN auteur au ON au.id = t.auteur_id JOIN '
      )
    ).toBe('blog.tag ta ON ta.article_id = t.id');
  });

  it('joins a table named like a keyword, which the shape writes in upper case', () => {
    const continuation = new HistoryContinuation({
      runs: [],
      blocks: blocksOf(
        'SELECT * FROM user u JOIN role r ON r.id = u.role_id WHERE u.status = 1'
      ),
    });

    expect(
      continuation.after('SELECT * FROM user x JOIN ', DatabaseEngine.MySQL)
    ).toBe('role r ON r.id = x.role_id');
  });

  it('skips a table the query already joins, and a condition on a table it lacks', () => {
    expect(
      blockAfter(
        'SELECT * FROM article art JOIN commentaire c ON c.article_id = art.id JOIN '
      )
    ).toBe('auteur AS au ON au.id = art.auteur_id');
    expect(blockAfter('SELECT * FROM auteur au JOIN ')).toBeNull();
  });

  it('proposes the most run condition on the tables of the query', () => {
    expect(blockAfter('SELECT * FROM article a WHERE ')).toBe('a.statut = 1');
    expect(blockAfter('SELECT * FROM auteur au WHERE ')).toBe("nom = 'Ada'");
    expect(blockAfter('SELECT * FROM article a ORDER BY ')).toBe('a.vues DESC');
  });

  it('proposes a clause that names a bare column on the tables it ran on only', () => {
    const continuation = new HistoryContinuation({
      runs: [],
      blocks: [
        ...blocksOf('SELECT * FROM article WHERE id = 3', 5),
        ...blocksOf(
          'SELECT * FROM article a JOIN commentaire c ON c.article_id = a.id WHERE statut = 1 ORDER BY date_creation',
          3
        ),
        ...blocksOf(
          'SELECT * FROM article a JOIN commentaire c ON c.article_id = a.id WHERE a.statut = 1',
          2
        ),
      ],
    });
    const after = (typed: string): string | null =>
      continuation.after(typed, DatabaseEngine.MySQL);

    expect(after('SELECT * FROM article a WHERE ')).toBe('id = 3');
    expect(
      after(
        'SELECT * FROM article a JOIN commentaire c ON c.article_id = a.id WHERE '
      )
    ).toBe('statut = 1');
    expect(
      after(
        'SELECT * FROM article a JOIN auteur au ON au.id = a.auteur_id WHERE '
      )
    ).toBe('a.statut = 1');
    expect(after('SELECT * FROM utilisateur u ORDER BY ')).toBeNull();
    expect(
      new HistoryContinuation({
        runs: [],
        blocks: blocksOf('SELECT * FROM article WHERE id = 3'),
      }).after(
        'SELECT * FROM article a JOIN article p ON p.id = a.parent_id WHERE ',
        DatabaseEngine.MySQL
      )
    ).toBeNull();
  });

  it('proposes the most run FROM as it ran', () => {
    expect(blockAfter('SELECT * FROM ')).toBe('auteur');
    expect(blockAfter('SELECT COUNT(*) FROM ')).toBe('auteur');
  });

  it('skips a clause whose columns no alias of the query can name', () => {
    const continuation = new HistoryContinuation({
      runs: [],
      blocks: [
        ...blocksOf(
          'SELECT * FROM blog.article WHERE blog.article.vues > 9',
          9
        ),
        ...blocksOf(
          'SELECT * FROM article art JOIN (SELECT article_id FROM commentaire) co ON co.article_id = art.id',
          9
        ),
        ...BLOCKS,
      ],
    });

    expect(
      continuation.after('SELECT * FROM article a WHERE ', DatabaseEngine.MySQL)
    ).toBe('a.statut = 1');
    expect(
      continuation.after('SELECT * FROM article a JOIN ', DatabaseEngine.MySQL)
    ).toBe('commentaire c ON c.article_id = a.id');
  });

  it('qualifies a column with the first alias of a table the query reads twice', () => {
    expect(
      blockAfter(
        'SELECT * FROM article a JOIN article p ON p.id = a.parent_id WHERE '
      )
    ).toBe('a.statut = 1');
  });

  it('reads the tables of the query outside its subqueries', () => {
    const continuation = new HistoryContinuation({
      runs: [],
      blocks: blocksOf('SELECT * FROM commentaire c ORDER BY c.date DESC'),
    });

    expect(
      continuation.after(
        'SELECT * FROM article a WHERE a.id IN (SELECT article_id FROM commentaire c) ORDER BY ',
        DatabaseEngine.MySQL
      )
    ).toBeNull();
  });

  it('waits for the clause to open, in a SELECT, outside any subquery', () => {
    expect(blockAfter('SELECT * FROM article a WHERE')).toBeNull();
    expect(blockAfter('DELETE FROM ')).toBeNull();
    expect(
      blockAfter(
        'SELECT * FROM auteur au WHERE au.id IN (SELECT auteur_id FROM article ar WHERE '
      )
    ).toBeNull();
  });
});
