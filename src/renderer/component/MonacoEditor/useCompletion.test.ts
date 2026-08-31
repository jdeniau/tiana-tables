/**
 * @vitest-environment happy-dom
 */
import { Position, editor, languages } from 'monaco-editor';
import { LanguageIdEnum } from 'monaco-sql-languages';
import { describe, expect, it } from 'vitest';
import { ColumnDetailHelper } from '../../../sql/ColumnDetailHelper';
import { ForeignKeysHelper } from '../../../sql/ForeignKeysHelper';
import { ShowTableStatus } from '../../../sql/types';
import { QuerySchema } from './queryAnalysis';
import { setQueryPrefix } from './queryPrefix';
import { buildCompletionProvider, validateModel } from './useCompletion';

const TABLE_LIST = [
  { Name: 'employee' },
  { Name: 'title' },
  { Name: 'planning' },
] as ShowTableStatus[];

const FOREIGN_KEYS = new ForeignKeysHelper([
  {
    TABLE_NAME: 'employee',
    COLUMN_NAME: 'title_id',
    REFERENCED_TABLE_NAME: 'title',
    REFERENCED_COLUMN_NAME: 'id',
    CONSTRAINT_NAME: 'employee_title_id_fkey',
  },
  {
    TABLE_NAME: 'planning',
    COLUMN_NAME: 'employee_id',
    REFERENCED_TABLE_NAME: 'employee',
    REFERENCED_COLUMN_NAME: 'id',
    CONSTRAINT_NAME: 'planning_employee_id_fkey',
  },
] as ConstructorParameters<typeof ForeignKeysHelper>[0]);

const ALL_COLUMNS = new ColumnDetailHelper([
  { Table: 'employee', Column: 'id', DataType: 'int' },
  { Table: 'employee', Column: 'name', DataType: 'varchar' },
  { Table: 'title', Column: 'id', DataType: 'int' },
  { Table: 'title', Column: 'label', DataType: 'varchar' },
] as ConstructorParameters<typeof ColumnDetailHelper>[0]);

/** what the table filter of `employee` implies around what the user types */
const WHERE_PREFIX = 'SELECT * FROM `employee` WHERE ';

/** `|` marks the caret, which reads better than a column number */
function completionsAt(
  sqlWithCaret: string,
  queryPrefix?: string
): languages.CompletionItem[] {
  const caret = sqlWithCaret.indexOf('|');

  if (caret === -1) {
    throw new Error('the query under test must mark the caret with a `|`');
  }

  const sql = sqlWithCaret.replace('|', '');
  const before = sqlWithCaret.slice(0, caret);
  const lastLineBreak = before.lastIndexOf('\n');
  const position = new Position(
    before.split('\n').length,
    caret - lastLineBreak
  );

  const model = editor.createModel(sql, LanguageIdEnum.MYSQL);
  setQueryPrefix(model, queryPrefix);

  try {
    const result = buildCompletionProvider(
      TABLE_LIST,
      FOREIGN_KEYS,
      ALL_COLUMNS
    ).provideCompletionItems(
      model,
      position,
      { triggerKind: languages.CompletionTriggerKind.Invoke },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any
    );

    return 'suggestions' in (result ?? {})
      ? (result as languages.CompletionList).suggestions
      : [];
  } finally {
    model.dispose();
  }
}

function labelsOfKind(
  sqlWithCaret: string,
  kind: languages.CompletionItemKind,
  queryPrefix?: string
): string[] {
  return completionsAt(sqlWithCaret, queryPrefix)
    .filter((item) => item.kind === kind)
    .map((item) => String(item.label));
}

const tables = (sql: string) =>
  labelsOfKind(sql, languages.CompletionItemKind.Variable);
const columns = (sql: string) =>
  labelsOfKind(sql, languages.CompletionItemKind.Field);
const keywords = (sql: string) =>
  labelsOfKind(sql, languages.CompletionItemKind.Keyword);

describe('tables', () => {
  it.each([
    'SELECT * FROM |',
    'SELECT * FROM employee e JOIN |',
    'SELECT * FROM employee e LEFT JOIN |',
  ])('proposes every table after FROM or JOIN: %s', (sql) => {
    expect(tables(sql)).toEqual(['employee', 'title', 'planning']);
  });

  it('proposes an alias that does not collide with the ones in use', () => {
    const suggestions = completionsAt('SELECT * FROM title t JOIN |');

    expect(suggestions.find((item) => item.label === 'title')?.insertText).toBe(
      'title ti '
    );
  });

  it('joins on the foreign key when there is one', () => {
    const suggestions = completionsAt('SELECT * FROM employee e JOIN |');

    expect(suggestions.find((item) => item.label === 'title')?.insertText).toBe(
      'title t ON t.id = e.title_id '
    );
    expect(
      suggestions.find((item) => item.label === 'planning')?.insertText
    ).toBe('planning p ON p.employee_id = e.id ');
  });

  it('falls back on the table name when the query declares no alias', () => {
    const suggestions = completionsAt('SELECT * FROM employee JOIN |');

    expect(suggestions.find((item) => item.label === 'title')?.insertText).toBe(
      'title t ON t.id = employee.title_id '
    );
  });

  it('proposes no table where a table cannot go', () => {
    expect(tables('SELECT | FROM employee e')).toEqual([]);
  });
});

describe('columns', () => {
  it('proposes only the columns of the aliased table', () => {
    expect(columns('SELECT e.| FROM employee e JOIN title t')).toEqual([
      'id',
      'name',
    ]);
  });

  it('proposes only the columns of the qualifying table', () => {
    expect(columns('SELECT employee.| FROM employee')).toEqual(['id', 'name']);
  });

  it('keeps the qualifier when a partial column name is typed', () => {
    // the whole table is proposed, Monaco narrows it down to what is typed
    expect(columns('SELECT t.la| FROM employee e JOIN title t')).toEqual([
      'id',
      'label',
    ]);
  });

  it('proposes the columns of every table of the query when unqualified', () => {
    expect(columns('SELECT | FROM employee e JOIN title t')).toEqual([
      'id',
      'name',
      'id',
      'label',
    ]);
  });

  it('proposes nothing for an unknown qualifier', () => {
    expect(columns('SELECT x.| FROM employee e')).toEqual([]);
  });

  it('replaces the word under the caret rather than inserting next to it', () => {
    const [suggestion] = completionsAt('SELECT e.na| FROM employee e').filter(
      (item) => item.kind === languages.CompletionItemKind.Field
    );

    // `na` spans columns 10 and 11, the suggestion must overwrite it
    expect(suggestion.range).toMatchObject({
      startColumn: 10,
      endColumn: 12,
    });
  });
});

describe('keywords', () => {
  it('comes from the grammar, not from a hardcoded list', () => {
    // a keyword only the parser knows to be valid right there
    expect(keywords('SELECT * FROM employee |')).toContain('JOIN');
    expect(keywords('SELECT * |')).toContain('FROM');
  });

  it('sorts schema names before keywords', () => {
    const suggestions = completionsAt('SELECT * FROM |');
    const table = suggestions.find((item) => item.label === 'employee');
    const keyword = suggestions.find(
      (item) => item.kind === languages.CompletionItemKind.Keyword
    );

    expect(table?.sortText).toBeDefined();
    expect(keyword?.sortText).toBeDefined();
    expect(String(table?.sortText) < String(keyword?.sortText)).toBe(true);
  });
});

describe('a query prefix', () => {
  const SCHEMA: QuerySchema = {
    database: 'test_db',
    tables: new Set(['employee', 'title', 'planning']),
    columns: new Map([
      ['employee', new Set(['id', 'name'])],
      ['title', new Set(['id', 'label'])],
    ]),
  };

  function markersOf(sql: string, queryPrefix?: string): editor.IMarker[] {
    const model = editor.createModel(sql, LanguageIdEnum.MYSQL);
    setQueryPrefix(model, queryPrefix);

    try {
      validateModel(model, SCHEMA);

      return editor.getModelMarkers({ resource: model.uri });
    } finally {
      model.dispose();
    }
  }

  it('makes a bare `WHERE` body a valid query', () => {
    // on its own, the body of the clause is not a statement
    expect(markersOf('name = "bob"')).not.toEqual([]);
    expect(markersOf('name = "bob"', WHERE_PREFIX)).toEqual([]);
  });

  it('reports an error of the body at its position in the editor', () => {
    const [marker, ...rest] = markersOf('name === "bob"', WHERE_PREFIX);

    expect(rest).toEqual([]);
    // the third `=`, counted from the editor content and not from the prefix
    expect(marker?.startColumn).toBe(8);
  });

  it('says nothing of an empty filter', () => {
    expect(markersOf('  ', WHERE_PREFIX)).toEqual([]);
  });

  it('warns on a column the prefixed table does not have', () => {
    const [marker] = markersOf('employee.wrong = 1', WHERE_PREFIX);

    expect(marker?.message).toBe('Unknown column `wrong` on table `employee`');
    expect(marker?.startColumn).toBe('employee.'.length + 1);
  });

  it('completes the columns of the table the filter runs on', () => {
    expect(
      labelsOfKind('|', languages.CompletionItemKind.Field, WHERE_PREFIX)
    ).toEqual(['id', 'name']);
  });

  it('completes a qualified column of that table', () => {
    expect(
      labelsOfKind(
        'employee.|',
        languages.CompletionItemKind.Field,
        WHERE_PREFIX
      )
    ).toEqual(['id', 'name']);
  });
});
