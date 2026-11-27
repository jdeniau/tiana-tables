/**
 * @vitest-environment happy-dom
 */
import { Position, editor, languages } from 'monaco-editor';
import { LanguageIdEnum } from 'monaco-sql-languages';
import { describe, expect, it } from 'vitest';
import { DatabaseEngine } from '../../../sql/engine';
import { HistoryContinuation } from '../../../sql/history/HistoryContinuation';
import { Clause } from '../../../sql/history/recordedStatement';
import { setQueryPrefix } from './queryPrefix';
import { buildGhostTextProvider } from './useGhostText';

const CONTINUATION = new HistoryContinuation({
  runs: ['SELECT * FROM lecture', 'DELETE FROM lecture\nWHERE id = ?'],
  blocks: [
    {
      clause: Clause.Where,
      sql: 'WHERE l.lu = 1',
      shape: 'WHERE lecture . lu = ?',
      aliases: { l: 'lecture' },
      runCount: 1,
    },
  ],
});

/** `|` marks the caret; `queryPrefix` is the query the editor holds the end of, as in the table filter */
function ghostTextAt(
  sqlWithCaret: string,
  queryPrefix?: string
): Array<string> {
  const caret = sqlWithCaret.indexOf('|');
  const before = sqlWithCaret.slice(0, caret);
  const model = editor.createModel(
    sqlWithCaret.replace('|', ''),
    LanguageIdEnum.MYSQL
  );

  setQueryPrefix(model, queryPrefix);

  try {
    const result = buildGhostTextProvider(
      DatabaseEngine.MySQL,
      CONTINUATION
    ).provideInlineCompletions(
      model,
      new Position(before.split('\n').length, caret - before.lastIndexOf('\n')),
      {} as languages.InlineCompletionContext,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any
    ) as languages.InlineCompletions;

    return result.items.map(({ insertText }) => String(insertText));
  } finally {
    model.dispose();
  }
}

describe('the ghost text', () => {
  it('continues the statement the caret ends, before its semicolon too', () => {
    expect(ghostTextAt('SELECT 1;\nSELECT * FROM |')).toEqual(['lecture']);
    expect(ghostTextAt('SELECT * FROM | ;')).toEqual(['lecture']);
  });

  it('shows nothing while the caret is inside the statement', () => {
    expect(ghostTextAt('SELECT * FROM | WHERE id = 1')).toEqual([]);
  });

  it('shows a text on several lines from the end of a line only', () => {
    expect(ghostTextAt('DELETE FROM lecture|')).toEqual(['\nWHERE id = ?']);
    expect(ghostTextAt('DELETE FROM lecture|  ')).toEqual([]);
  });

  it('reads the table filter as the end of the query it filters', () => {
    const filter = 'SELECT * FROM `lecture` WHERE ';

    expect(ghostTextAt('s|', filter)).toEqual([]);
    expect(ghostTextAt('|', filter)).toEqual(['`lecture`.lu = 1']);
  });
});
