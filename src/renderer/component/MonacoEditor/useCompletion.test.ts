/**
 * @vitest-environment jsdom
 */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { describe, expect, test, vi } from 'vitest';
import { ColumnDetailHelper } from '../../../sql/ColumnDetailHelper';
import { ForeignKeysHelper } from '../../../sql/ForeignKeysHelper';
import { ShowTableStatus } from '../../../sql/types';
import { testables } from './useCompletion';

const { provideCompletionItems, SQL_KEYWORDS } = testables;

describe('sql keywords', () => {
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
      new ForeignKeysHelper([]),
      new ColumnDetailHelper([])
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
});

describe('table list', () => {
  test.each([
    // { sql: 'SELECT * FROM', addSpace: true },
    // { sql: 'SELECT * FROM table_name LEFT JOIN', addSpace: true },
    { sql: 'SELECT * FROM ' },
    { sql: 'SELECT * FROM database.' },
    { sql: 'SELECT * FROM WHERE foo = bar ', column: 15 }, // after FROM
    { sql: 'SELECT * FROM table_name WHERE foo = bar ', column: 15 }, // after FROM
    { sql: 'SELECT * FROM table_name JOIN ' },
    { sql: 'SELECT * FROM table_name LEFT JOIN ' },
    { sql: 'SELECT * FROM ta', startColumn: 15 }, // partial table name
  ])(
    'should return tablelist if we are after FROM or JOIN',
    ({ sql, column, startColumn }) => {
      const definedColumn = startColumn ?? column ?? sql.length + 1;
      const tableList: ShowTableStatus[] = [
        // @ts-expect-error don't want all data, only the name
        { Name: 'table1' },
        // @ts-expect-error don't want all data, only the name
        { Name: 'table2' },
        // @ts-expect-error don't want all data, only the name
        { Name: 'another_table' },
      ];

      const position = new monaco.Position(1, definedColumn);

      const model = monaco.editor.createModel(sql, 'sql');

      const result = provideCompletionItems(
        monaco.languages,
        tableList,
        new ForeignKeysHelper([]),
        new ColumnDetailHelper([])
      )(
        model,
        position,
        { triggerKind: monaco.languages.CompletionTriggerKind.Invoke },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      );

      const spacePrefix = ''; // addSpace ? ' ' : '';

      expect(result).toEqual({
        suggestions: [
          {
            label: 'table1',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `${spacePrefix}table1 t `,
            detail: undefined,
            range: new monaco.Range(1, definedColumn, 1, definedColumn),
          },
          {
            label: 'table2',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `${spacePrefix}table2 t `,
            detail: undefined,
            range: new monaco.Range(1, definedColumn, 1, definedColumn),
          },
          {
            label: 'another_table',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `${spacePrefix}another_table at `,
            detail: undefined,
            range: new monaco.Range(1, definedColumn, 1, definedColumn),
          },
        ],
      });
    }
  );

  test.each([
    { sql: 'SELECT * FROM employee e JOIN ', table: 'employee', alias: 'e' },
    { sql: 'SELECT * FROM employee JOIN ', table: 'employee' },
  ])(
    'should return tablelist with aliases if we are after FROM or JOIN',
    ({ sql, table, alias }) => {
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
        helper,
        new ColumnDetailHelper([])
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
            detail: table,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `title t ON t.id = ${alias || table}.title_id `,
            range: new monaco.Range(1, definedColumn, 1, definedColumn),
          },
          {
            label: 'planning',
            detail: table,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `planning p ON p.employee_id = ${alias || table}.id `,
            range: new monaco.Range(1, definedColumn, 1, definedColumn),
          },
        ],
      });
    }
  );
});

describe('column in SELECT or WHERE', () => {
  test.each([
    { sql: 'SELECT employee. FROM  employee LIMIT 10', column: 17 },
    {
      sql: 'SELECT e. FROM employee e JOIN title as t LIMIT 10',
      column: 10,
    },
    {
      sql: 'SELECT e.* FROM employee e JOIN title as t WHERE e. LIMIT 10',
      column: 52,
    },
    // partial column name already typed
    { sql: 'SELECT employee.n FROM  employee LIMIT 10', column: 18, startColumn: 17 },
    {
      sql: 'SELECT e.n FROM employee e JOIN title as t LIMIT 10',
      column: 11,
      startColumn: 10,
    },
  ])('after alias', ({ sql, column, startColumn }) => {
    const position = new monaco.Position(1, column);

    const model = monaco.editor.createModel(sql, 'sql');

    const result = provideCompletionItems(
      monaco.languages,
      [],
      new ForeignKeysHelper([]),
      new ColumnDetailHelper([
        // @ts-expect-error RawDataPacket issue
        { Table: 'employee', Column: 'id', DataType: 'number' },
        // @ts-expect-error RawDataPacket issue
        { Table: 'employee', Column: 'name', DataType: 'varchar' },
        // @ts-expect-error RawDataPacket issue
        { Table: 'title', Column: 'position', DataType: 'varchar' },
      ])
    )(
      model,
      position,
      { triggerKind: monaco.languages.CompletionTriggerKind.Invoke },
      { isCancellationRequested: false, onCancellationRequested: vi.fn() }
    );

    expect(result).toEqual({
      suggestions: [
        {
          label: 'id',
          detail: 'employee',
          insertText: 'id',
          kind: monaco.languages.CompletionItemKind.Field,
          range: new monaco.Range(1, column, 1, startColumn ?? column),
        },
        {
          label: 'name',
          detail: 'employee',
          insertText: 'name',
          kind: monaco.languages.CompletionItemKind.Field,
          range: new monaco.Range(1, column, 1, startColumn ?? column),
        },
      ],
    });
  });
});
