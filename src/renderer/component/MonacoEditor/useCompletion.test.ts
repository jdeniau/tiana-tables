/**
 * @vitest-environment jsdom
 */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { describe, expect, test, vi } from 'vitest';
import { ShowTableStatus } from '../../../sql/types';
import { testables } from './useCompletion';

const { provideCompletionItems, SQL_KEYWORDS } = testables;

describe('provideCompletionItems', () => {
  test.each([
    { sql: '' },
    { sql: 'SELECT * ' },
    { sql: 'SELECT * FROM table_name ' },
    { sql: 'SELECT * FROM table_name ', column: 1 },
    { sql: 'SELECT * FROM table_name WHERE foo = "foo" ' },
  ])('should return suggestions for SQL keywords', ({ sql, column }) => {
    const definedColumn = column ?? sql.length + 1;
    const tableList: ShowTableStatus[] = [];
    const position = new monaco.Position(1, definedColumn);

    const model = monaco.editor.createModel(sql, 'sql');

    const result = provideCompletionItems(monaco.languages, tableList)(
      model,
      position,
      { triggerKind: monaco.languages.CompletionTriggerKind.Invoke },
      { isCancellationRequested: false, onCancellationRequested: vi.fn() }
    );

    expect(result).toEqual({
      suggestions: SQL_KEYWORDS.map((keyword) => ({
        label: keyword,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: keyword,
        range: new monaco.Range(1, definedColumn - 1, 1, definedColumn),
      })),
    });
  });

  test.each([
    { sql: 'SELECT * FROM' },
    { sql: 'SELECT * FROM ' },
    { sql: 'SELECT * FROM database.' },
    { sql: 'SELECT * FROM WHERE foo = bar ', column: 15 },
    { sql: 'SELECT * FROM table_name WHERE foo = bar ', column: 15 },
    { sql: 'SELECT * FROM table_name JOIN ' },
    { sql: 'SELECT * FROM table_name LEFT JOIN ' },
    { sql: 'SELECT * FROM table_name LEFT JOIN' },
  ])(
    'should return tablelist if we are after FROM or JOIN',
    ({ sql, column }) => {
      const definedColumn = column ?? sql.length + 1;
      const tableList: ShowTableStatus[] = [
        // @ts-expect-error don't want all data, only the name
        { Name: 'table1' },
        // @ts-expect-error don't want all data, only the name
        { Name: 'table2' },
      ];

      const position = new monaco.Position(1, definedColumn);

      const model = monaco.editor.createModel(sql, 'sql');

      const result = provideCompletionItems(monaco.languages, tableList)(
        model,
        position,
        { triggerKind: monaco.languages.CompletionTriggerKind.Invoke },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      expect(result).toEqual({
        suggestions: tableList.map((table) => ({
          label: table.Name,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: table.Name,
          range: new monaco.Range(1, definedColumn, 1, definedColumn),
        })),
      });
    }
  );
});
