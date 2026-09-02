import { describe, expect, test } from 'vitest';
import { splitStatements, statementAtOffset } from './splitStatements';

function sqlOf(content: string): string[] {
  return splitStatements(content).map((statement) => statement.sql);
}

describe('splitStatements', () => {
  test('reads a lone statement, with or without its `;`', () => {
    expect(sqlOf('SELECT 1')).toEqual(['SELECT 1']);
    expect(sqlOf('SELECT 1;')).toEqual(['SELECT 1;']);
  });

  test('cuts on the `;` between statements', () => {
    expect(sqlOf('SELECT 1;\nUPDATE t SET a = 1;\n')).toEqual([
      'SELECT 1;',
      'UPDATE t SET a = 1;',
    ]);
  });

  test('keeps the tail the user has not terminated yet', () => {
    expect(sqlOf('SELECT 1;\nSELECT 2')).toEqual(['SELECT 1;', 'SELECT 2']);
  });

  // splitting is what the editor does on every keystroke: a statement being
  // typed must still come out, where `splitSQLByStatement` would answer `null`
  test('splits an input the parser would reject', () => {
    expect(sqlOf('SELECT FROM t a;\nSELECT * FROM b WHERE')).toEqual([
      'SELECT FROM t a;',
      'SELECT * FROM b WHERE',
    ]);
  });

  test('does not cut on a `;` written in a string literal', () => {
    expect(sqlOf("SELECT 'a;b' FROM t;")).toEqual(["SELECT 'a;b' FROM t;"]);
  });

  test('does not cut on a `;` written in a comment', () => {
    expect(sqlOf('SELECT 1;\n/* or;here */\nSELECT 2;')).toEqual([
      'SELECT 1;',
      '/* or;here */\nSELECT 2;',
    ]);
  });

  // and so a comment documenting a query is run with it, rather than dropped
  test('a comment between two statements belongs to the one that follows', () => {
    expect(sqlOf('SELECT 1;\n-- count them\nSELECT 2;')).toEqual([
      'SELECT 1;',
      '-- count them\nSELECT 2;',
    ]);
  });

  test('holds no statement for a content that is only trivia', () => {
    expect(sqlOf('')).toEqual([]);
    expect(sqlOf('\n\n  ')).toEqual([]);
    expect(sqlOf('-- nothing to run\n')).toEqual([]);
    expect(sqlOf(';;')).toEqual([]);
  });

  test('reports where each statement sits in the content', () => {
    const content = '\nSELECT 1;\n\nSELECT 2;\n';

    expect(splitStatements(content)).toEqual([
      { sql: 'SELECT 1;', start: 1, end: 10 },
      { sql: 'SELECT 2;', start: 12, end: 21 },
    ]);
    expect(content.slice(12, 21)).toBe('SELECT 2;');
  });
});

describe('statementAtOffset', () => {
  const content = 'SELECT 1;\n\nSELECT 2;\n';
  const statements = splitStatements(content);

  test('answers the statement the caret is inside of', () => {
    expect(statementAtOffset(statements, content.indexOf('1'))?.sql).toBe(
      'SELECT 1;'
    );
    expect(statementAtOffset(statements, content.indexOf('2'))?.sql).toBe(
      'SELECT 2;'
    );
  });

  test('a caret right after a `;` still belongs to that statement', () => {
    expect(statementAtOffset(statements, 9)?.sql).toBe('SELECT 1;');
    expect(statementAtOffset(statements, 10)?.sql).toBe('SELECT 1;');
  });

  test('a caret past the last statement belongs to it', () => {
    expect(statementAtOffset(statements, content.length)?.sql).toBe(
      'SELECT 2;'
    );
  });

  test('a caret before the first statement belongs to it', () => {
    expect(statementAtOffset(splitStatements('\n\nSELECT 1;'), 0)?.sql).toBe(
      'SELECT 1;'
    );
  });

  test('answers nothing when there is nothing to run', () => {
    expect(statementAtOffset([], 0)).toBeUndefined();
  });
});
