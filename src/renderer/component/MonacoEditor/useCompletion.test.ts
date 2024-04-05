/**
 * @vitest-environment jsdom
 */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { describe, expect, test, vi } from 'vitest';
import { ForeignKeysHelper } from '../../../sql/ForeignKeysHelper';
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

    const result = provideCompletionItems(
      monaco.languages,
      tableList,
      new ForeignKeysHelper([])
    )(
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
    { sql: 'SELECT * FROM' }, // TODO should not allow a table, or should add a spacing
    { sql: 'SELECT * FROM table_name LEFT JOIN' }, // TODO should not allow a table, or should add a spacing
    { sql: 'SELECT * FROM ' },
    { sql: 'SELECT * FROM database.' },
    { sql: 'SELECT * FROM WHERE foo = bar ', column: 15 },
    { sql: 'SELECT * FROM table_name WHERE foo = bar ', column: 15 },
    { sql: 'SELECT * FROM table_name JOIN ' },
    { sql: 'SELECT * FROM table_name LEFT JOIN ' },
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

      const result = provideCompletionItems(
        monaco.languages,
        tableList,
        new ForeignKeysHelper([])
      )(
        model,
        position,
        { triggerKind: monaco.languages.CompletionTriggerKind.Invoke },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      expect(result).toEqual({
        suggestions: [
          {
            label: 'table1',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `table1 t `,
            range: new monaco.Range(1, definedColumn, 1, definedColumn),
          },
          {
            label: 'table2',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `table2 t `,
            range: new monaco.Range(1, definedColumn, 1, definedColumn),
          },
        ],
      });
    }
  );

  test.each([
    { sql: 'SELECT * FROM employee e JOIN ', alias: 'e' },
    { sql: 'SELECT * FROM employee JOIN ', alias: 'employee' },
  ])(
    'should return tablelist with aliases if we are after FROM or JOIN',
    ({ sql, alias }) => {
      const definedColumn = sql.length + 1;
      const tableList: ShowTableStatus[] = [
        // @ts-expect-error don't want all data, only the name
        { Name: 'title' },
        // @ts-expect-error don't want all data, only the name
        { Name: 'planning' },
      ];

      const helper = new ForeignKeysHelper([
        // @ts-expect-error issue with contstructor name
        {
          TABLE_NAME: 'employee',
          COLUMN_NAME: 'title_id',
          REFERENCED_TABLE_NAME: 'title',
          REFERENCED_COLUMN_NAME: 'id',
          CONSTRAINT_NAME: 'employee_title_id_fkey',
        },
        // @ts-expect-error issue with contstructor name
        {
          TABLE_NAME: 'planning',
          COLUMN_NAME: 'employee_id',
          REFERENCED_TABLE_NAME: 'employee',
          REFERENCED_COLUMN_NAME: 'id',
          CONSTRAINT_NAME: 'employee_employee_id_fkey',
        },
      ]);

      const position = new monaco.Position(1, definedColumn);

      const model = monaco.editor.createModel(sql, 'sql');

      const result = provideCompletionItems(
        monaco.languages,
        tableList,
        helper
      )(
        model,
        position,
        { triggerKind: monaco.languages.CompletionTriggerKind.Invoke },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      expect(result).toEqual({
        suggestions: [
          {
            label: 'title',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `title t ON t.id = ${alias}.title_id `,
            range: new monaco.Range(1, definedColumn, 1, definedColumn),
          },
          {
            label: 'planning',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `planning p ON p.employee_id = ${alias}.id `,
            range: new monaco.Range(1, definedColumn, 1, definedColumn),
          },
        ],
      });
    }
  );
});
