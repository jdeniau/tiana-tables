import { mysqlParser } from './mysqlParser';

/** A statement of the editor, and where it sits in the content. */
export type SqlStatement = {
  /** the statement as written, its trailing `;` included when it has one */
  sql: string;
  /** offset of its first character in the content */
  start: number;
  /** offset just after its last character */
  end: number;
};

/**
 * The channel the lexer puts SQL on. Whitespace and comments go to another
 * one, which is what tells a separator from a `;` written in a comment.
 */
const CODE_CHANNEL = 0;

/**
 * Cut the content of the editor into the statements it holds.
 *
 * We lex, we never parse: `splitSQLByStatement` returns `null` as soon as the
 * input has a syntax error — `SELECT FROM t` included — while lexing always
 * answers, and a statement still being typed has to stay runnable. A `;` in a
 * string literal or in a comment is never a separator: the lexer reads either
 * as a single token.
 *
 * A segment holding nothing but comments and whitespace is not a statement,
 * so the trailing newline after the last `;` does not make one. A comment
 * sitting between two statements belongs to the one that follows it, so the
 * comment documenting a query is run — and highlighted — with it.
 */
export function splitStatements(content: string): SqlStatement[] {
  const statements: SqlStatement[] = [];
  let segmentStart = 0;
  let hasCode = false;

  const closeSegment = (segmentEnd: number): void => {
    if (hasCode) {
      const segment = content.slice(segmentStart, segmentEnd);
      const sql = segment.trim();
      const start = segmentStart + (segment.length - segment.trimStart().length);

      statements.push({ sql, start, end: start + sql.length });
    }

    segmentStart = segmentEnd;
    hasCode = false;
  };

  for (const token of mysqlParser.getAllTokens(content)) {
    if (token.channel !== CODE_CHANNEL) {
      continue;
    }

    if (token.text === ';') {
      closeSegment(token.stop + 1);
    } else {
      hasCode = true;
    }
  }

  closeSegment(content.length);

  return statements;
}

/**
 * The statement the caret sits in.
 *
 * The caret is most often right after the `;` it has just typed, so anything
 * between two statements belongs to the one before it; anything before the
 * first statement — a header comment, an empty line — belongs to that first
 * one.
 */
export function statementAtOffset(
  statements: SqlStatement[],
  offset: number
): SqlStatement | undefined {
  return (
    statements.findLast((statement) => statement.start <= offset) ??
    statements[0]
  );
}
