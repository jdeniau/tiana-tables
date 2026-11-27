import { describe, expect, it } from 'vitest';
import { DatabaseEngine } from '../engine';
import { HistoryUsage } from './HistoryUsage';
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

const JOINED = blocksOf(
  'SELECT a.titre, au.nom FROM article a JOIN auteur au ON au.id = a.auteur_id WHERE a.statut = 1',
  3
);

describe('tables', () => {
  it('counts the runs that read a table, in its FROM or a JOIN', () => {
    const usage = new HistoryUsage([
      ...JOINED,
      ...blocksOf('SELECT * FROM article', 2),
    ]);

    expect(usage.ofTable('article')).toBe(5);
    expect(usage.ofTable('auteur')).toBe(3);
    expect(usage.ofTable('commentaire')).toBe(0);
  });

  it('names the joined table without its database', () => {
    const usage = new HistoryUsage(
      blocksOf(
        'SELECT * FROM article a JOIN blog.auteur au ON au.id = a.auteur_id'
      )
    );

    expect(usage.ofTable('auteur')).toBe(1);
  });

  it('counts the tables named like a keyword, which the shape writes in upper case', () => {
    const usage = new HistoryUsage(
      blocksOf(
        'SELECT * FROM user u JOIN language l ON l.id = u.language_id WHERE u.status = 1'
      )
    );

    expect(usage.ofTable('user')).toBe(1);
    expect(usage.ofTable('language')).toBe(1);
    expect(usage.ofJoin('user', 'language')).toBe(1);
    expect(usage.ofColumn('user', 'status')).toBe(1);
  });
});

describe('columns', () => {
  it('counts the columns a clause qualifies, through their aliases', () => {
    const usage = new HistoryUsage(JOINED);

    expect(usage.ofColumn('article', 'titre')).toBe(3);
    expect(usage.ofColumn('article', 'auteur_id')).toBe(3);
    expect(usage.ofColumn('auteur', 'nom')).toBe(3);
    expect(usage.ofColumn('auteur', 'titre')).toBe(0);
  });

  it('counts a column once per clause, however often the clause names it', () => {
    const usage = new HistoryUsage(
      blocksOf('SELECT * FROM article a WHERE a.id > 1 AND a.id < 9')
    );

    expect(usage.ofColumn('article', 'id')).toBe(1);
  });

  it('counts a column named like a keyword, which the shape writes in upper case', () => {
    const usage = new HistoryUsage(
      blocksOf('SELECT a.date FROM article a ORDER BY a.date')
    );

    expect(usage.ofColumn('article', 'date')).toBe(2);
  });

  it('counts the bare names of a statement that reads one table, not its functions nor its aliases', () => {
    const usage = new HistoryUsage(
      blocksOf('SELECT titre, count(id) AS total FROM article GROUP BY titre')
    );

    expect(usage.ofColumn('article', 'titre')).toBe(2);
    expect(usage.ofColumn('article', 'id')).toBe(1);
    expect(usage.ofColumn('article', 'count')).toBe(0);
    expect(usage.ofColumn('article', 'total')).toBe(0);
  });

  it('counts a bare column named like a keyword only where it is compared, as the history keys its clause', () => {
    const usage = new HistoryUsage([
      ...blocksOf(
        "SELECT titre FROM seance WHERE position > 2 AND debut > DATE '2026-01-01'"
      ),
      ...blocksOf('SELECT titre FROM seance ORDER BY position'),
    ]);

    expect(usage.ofColumn('seance', 'position')).toBe(1);
    expect(usage.ofColumn('seance', 'date')).toBe(0);
    expect(usage.ofColumn('seance', 'order')).toBe(0);
  });

  it('leaves out the bare names of a statement that reads several tables', () => {
    const usage = new HistoryUsage(
      blocksOf(
        'SELECT nom FROM article a JOIN auteur au ON au.id = a.auteur_id'
      )
    );

    expect(usage.ofColumn('article', 'nom')).toBe(0);
    expect(usage.ofColumn('auteur', 'nom')).toBe(0);
  });
});

describe('joins', () => {
  it('counts a join between the joined table and those its condition names, both ways', () => {
    const usage = new HistoryUsage(JOINED);

    expect(usage.ofJoin('auteur', 'article')).toBe(3);
    expect(usage.ofJoin('article', 'auteur')).toBe(3);
  });

  it('joins only the tables whose columns the condition reads, not a column named like a table', () => {
    const usage = new HistoryUsage(
      blocksOf(
        "SELECT * FROM article a JOIN auteur au ON au.id = a.auteur_id JOIN commentaire c ON c.article_id = a.id AND c.auteur = 'Ada'"
      )
    );

    expect(usage.ofJoin('commentaire', 'article')).toBe(1);
    expect(usage.ofJoin('commentaire', 'auteur')).toBe(0);
  });
});
